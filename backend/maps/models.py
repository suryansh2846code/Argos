import uuid
# pyrefly: ignore [missing-import]
from django.db import models
# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from django.core.exceptions import ValidationError

class BoardType(models.TextChoices):
    FREEFORM = 'freeform', 'Freeform'
    DEBATE   = 'debate',   'Debate'


class Map(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(
        max_length=255,
        help_text="The title of the argument map."
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Detailed description or goal of the map."
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_maps',
        help_text="The owner/creator of the map."
    )
    is_public = models.BooleanField(
        default=True,
        help_text="Whether this map is publicly visible or private."
    )
    board_type = models.CharField(
        max_length=20,
        choices=BoardType.choices,
        default=BoardType.FREEFORM,
        help_text="Board type chosen at creation. Immutable after creation."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['creator']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.title


class NodeType(models.TextChoices):
    CLAIM = 'claim', 'Claim'
    ARGUMENT = 'argument', 'Argument'
    EVIDENCE = 'evidence', 'Evidence'
    QUESTION = 'question', 'Question'


class Node(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    map = models.ForeignKey(
        Map,
        on_delete=models.CASCADE,
        related_name='nodes',
        help_text="The map this node belongs to."
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nodes',
        help_text="The user who created this node."
    )
    content = models.TextField(
        help_text="The argument, claim, evidence, or question this node represents."
    )
    node_type = models.CharField(
        max_length=20,
        choices=NodeType.choices,
        default=NodeType.CLAIM,
        help_text="The logical role of this node."
    )
    x_position = models.FloatField(
        default=0.0,
        help_text="Visual X position on canvas."
    )
    y_position = models.FloatField(
        default=0.0,
        help_text="Visual Y position on canvas."
    )
    is_root = models.BooleanField(
        default=False,
        help_text="System root node — one per map, mirrors map title.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['map', 'created_at']),
            models.Index(fields=['creator']),
            models.Index(fields=['map', 'is_root']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['map'],
                condition=models.Q(is_root=True),
                name='unique_root_node_per_map',
            ),
        ]

    def __str__(self):
        return f"[{self.node_type.upper()}] {self.content[:50]}"


class EdgeType(models.TextChoices):
    SUPPORT   = 'support',   'Support'
    COUNTER   = 'counter',   'Counter'
    REFERENCE = 'reference', 'Reference'


class Edge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    map = models.ForeignKey(
        Map,
        on_delete=models.CASCADE,
        related_name='edges',
        help_text="The map this edge belongs to."
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='edges',
        help_text="The user who created this edge."
    )
    source = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='outgoing_edges',
        help_text="The supporting or countering node."
    )
    target = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='incoming_edges',
        help_text="The node being supported or countered."
    )
    edge_type = models.CharField(
        max_length=20,
        choices=EdgeType.choices,
        default=EdgeType.SUPPORT,
        help_text="Whether this edge supports or counters the target node."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        constraints = [
            # Prevent self-loops in the database
            models.CheckConstraint(
                condition=~models.Q(source=models.F('target')),
                name='prevent_self_loop'
            ),
            # Prevent duplicate edges from source to target
            models.UniqueConstraint(
                fields=['source', 'target'],
                name='unique_source_target_edge'
            )
        ]
        indexes = [
            models.Index(fields=['map']),
        ]

    def clean(self):
        super().clean()
        # Enforce that both nodes belong to the same Map
        if self.source_id and self.target_id:
            if self.source.map_id != self.map_id or self.target.map_id != self.map_id:
                raise ValidationError("Both source and target nodes must belong to the same Map.")
            if self.source_id == self.target_id:
                raise ValidationError("A node cannot connect to itself (no self-loops).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.source.content[:20]} --({self.edge_type})--> {self.target.content[:20]}"


class AttachmentType(models.TextChoices):
    IMAGE = 'image', 'Image'
    GIF = 'gif', 'GIF'
    VIDEO = 'video', 'Video'
    LINK = 'link', 'Link'


class NodeAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='node_attachments',
    )
    attachment_type = models.CharField(
        max_length=20,
        choices=AttachmentType.choices,
    )
    file = models.FileField(
        upload_to='attachments/%Y/%m/',
        blank=True,
        null=True,
        help_text='Legacy local file storage. New uploads use ImageKit (external_url).'
    )
    external_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='CDN URL (ImageKit) for media, YouTube URL for video links, or link URL.'
    )
    # ImageKit metadata — populated automatically on upload, used for CDN deletion
    imagekit_file_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='ImageKit fileId — used to delete the CDN file when the attachment is removed.',
    )
    imagekit_thumbnail_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='ImageKit thumbnail URL (400×300, images/GIFs only).'
    )
    title = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['node', 'created_at']),
        ]

    def clean(self):
        super().clean()
        if self.attachment_type == AttachmentType.LINK:
            if not self.external_url:
                raise ValidationError('Link attachments require an external URL.')
        elif self.external_url:
            # external_url can substitute for file:
            #   - ImageKit CDN URLs (images, GIFs, videos)
            #   - YouTube / external video URLs
            return
        elif not self.file:
            raise ValidationError(
                'File attachments require either an uploaded file or a CDN URL.'
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attachment_type} on {self.node_id}"


class VoteType(models.TextChoices):
    UPVOTE = 'upvote', 'Upvote'
    DOWNVOTE = 'downvote', 'Downvote'


class NodeVote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='node_votes',
    )
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name='votes',
    )
    vote_type = models.CharField(
        max_length=20,
        choices=VoteType.choices,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'node'],
                name='unique_user_node_vote',
            )
        ]
        indexes = [
            models.Index(fields=['node']),
        ]

    def __str__(self):
        return f"{self.user} {self.vote_type} on {self.node_id}"
