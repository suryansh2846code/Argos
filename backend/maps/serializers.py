# pyrefly: ignore [missing-import]
from rest_framework import serializers
# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
# pyrefly: ignore [missing-import]
from django.contrib.auth.password_validation import validate_password
from .models import (
    Map, Node, Edge, NodeAttachment, NodeVote,
    AttachmentType, VoteType, BoardType,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'date_joined']
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'password_confirm']
        read_only_fields = ['id']

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
        )


class MapSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    nodes_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Map
        fields = [
            'id', 'title', 'description', 'creator', 'is_public',
            'board_type', 'created_at', 'updated_at', 'nodes_count',
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at', 'nodes_count']

    def validate_board_type(self, value):
        # board_type is immutable after creation
        if self.instance is not None:
            if value != self.instance.board_type:
                raise serializers.ValidationError(
                    'Board type cannot be changed after creation.'
                )
        return value


class NodeAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = NodeAttachment
        fields = [
            'id', 'node', 'uploaded_by', 'attachment_type',
            'file', 'file_url', 'external_url', 'title', 'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'file_url', 'created_at']
        extra_kwargs = {'file': {'required': False}}

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def validate(self, attrs):
        attachment_type = attrs.get(
            'attachment_type',
            getattr(self.instance, 'attachment_type', None),
        )
        file = attrs.get('file')
        external_url = attrs.get('external_url', '')

        if attachment_type == AttachmentType.LINK:
            if not external_url and not (self.instance and self.instance.external_url):
                raise serializers.ValidationError(
                    {'external_url': 'Link attachments require a URL.'}
                )
        elif attachment_type == AttachmentType.VIDEO and external_url:
            pass
        elif not file and not (self.instance and self.instance.file):
            raise serializers.ValidationError(
                {'file': 'File attachments require an uploaded file.'}
            )
        return attrs

    def validate_node(self, value):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication is required.')

        user = request.user
        if not value.map.is_public and value.map.creator != user:
            raise serializers.ValidationError(
                'You do not have permission to attach to this private map.'
            )
        return value


class VoteSummarySerializer(serializers.Serializer):
    upvotes = serializers.IntegerField()
    downvotes = serializers.IntegerField()
    agreement_percent = serializers.IntegerField(allow_null=True)
    controversy = serializers.CharField()
    user_vote = serializers.CharField(allow_null=True)


def compute_vote_summary(node, user=None):
    votes = node.votes.all()
    upvotes = votes.filter(vote_type=VoteType.UPVOTE).count()
    downvotes = votes.filter(vote_type=VoteType.DOWNVOTE).count()
    total = upvotes + downvotes

    user_vote = None
    if user and user.is_authenticated:
        vote = votes.filter(user=user).first()
        if vote:
            user_vote = vote.vote_type

    agreement_percent = None
    controversy = 'no_votes'

    if total > 0:
        agreement_percent = round((upvotes / total) * 100)
        ratio = upvotes / total
        if ratio >= 0.75:
            controversy = 'highly_agreed'
        elif ratio <= 0.25:
            controversy = 'highly_disputed'
        else:
            controversy = 'mixed_opinions'

    return {
        'upvotes': upvotes,
        'downvotes': downvotes,
        'agreement_percent': agreement_percent,
        'controversy': controversy,
        'user_vote': user_vote,
    }


class NodeSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    map = serializers.PrimaryKeyRelatedField(queryset=Map.objects.all())
    attachments = NodeAttachmentSerializer(many=True, read_only=True)
    vote_summary = serializers.SerializerMethodField()

    class Meta:
        model = Node
        fields = [
            'id', 'map', 'creator', 'content', 'node_type',
            'x_position', 'y_position', 'is_root', 'created_at', 'updated_at',
            'attachments', 'vote_summary',
        ]
        read_only_fields = ['id', 'creator', 'is_root', 'created_at', 'updated_at']

    def get_vote_summary(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        return compute_vote_summary(obj, user)

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.is_root:
            if 'node_type' in attrs and attrs['node_type'] != instance.node_type:
                raise serializers.ValidationError(
                    {'node_type': 'Root node type cannot be changed.'}
                )
            if 'content' in attrs and attrs['content'] != instance.content:
                raise serializers.ValidationError(
                    {'content': 'Root node content mirrors the map title. Edit the map instead.'}
                )
        return attrs

    def validate_map(self, value):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication is required to add nodes.')

        user = request.user
        if not value.is_public and value.creator != user:
            raise serializers.ValidationError(
                'You do not have permission to contribute to this private map.'
            )
        return value


class NodeVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = NodeVote
        fields = ['id', 'node', 'vote_type', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_node(self, value):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication is required.')
        return value

    def validate_vote_type(self, value):
        if value not in (VoteType.UPVOTE, VoteType.DOWNVOTE):
            raise serializers.ValidationError('Invalid vote type.')
        return value


class EdgeSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    map = serializers.PrimaryKeyRelatedField(read_only=True)
    source = serializers.PrimaryKeyRelatedField(queryset=Node.objects.all())
    target = serializers.PrimaryKeyRelatedField(queryset=Node.objects.all())

    class Meta:
        model = Edge
        fields = ['id', 'map', 'creator', 'source', 'target', 'edge_type', 'created_at']
        read_only_fields = ['id', 'map', 'creator', 'created_at']

    def validate(self, attrs):
        source = attrs.get('source')
        target = attrs.get('target')
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError('Authentication is required.')

        user = request.user

        if source and target:
            if source.id == target.id:
                raise serializers.ValidationError('A node cannot connect to itself (no self-loops).')
            if source.map_id != target.map_id:
                raise serializers.ValidationError(
                    'Both source and target nodes must belong to the same Map.'
                )

            map_obj = source.map
            if not map_obj.is_public and map_obj.creator != user:
                raise serializers.ValidationError(
                    'You do not have permission to contribute to this private map.'
                )

            attrs['map'] = map_obj

        return attrs
