# pyrefly: ignore [missing-import]
from rest_framework import viewsets, permissions, filters, status
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
# pyrefly: ignore [missing-import]
from django.db.models import Q, Count
from .models import Map, Node, Edge, NodeAttachment, NodeVote
from .serializers import (
    MapSerializer, NodeSerializer, EdgeSerializer,
    NodeAttachmentSerializer, NodeVoteSerializer,
    compute_vote_summary,
)
from .permissions import (
    IsMapOwnerOrReadOnly,
    IsNodeOwnerOrMapOwnerOrReadOnly,
    IsEdgeOwnerOrMapOwnerOrReadOnly,
    IsAttachmentOwnerOrReadOnly,
    CanContributeToMap,
)
from .services import create_root_node, sync_root_node_title


class MapViewSet(viewsets.ModelViewSet):
    serializer_class = MapSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsMapOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Map.objects.select_related('creator').annotate(
            nodes_count=Count('nodes', distinct=True),
        )

        if user.is_authenticated:
            return queryset.filter(Q(is_public=True) | Q(creator=user))
        return queryset.filter(is_public=True)

    def perform_create(self, serializer):
        map_obj = serializer.save(creator=self.request.user)
        create_root_node(map_obj)

    def perform_update(self, serializer):
        map_obj = serializer.save()
        sync_root_node_title(map_obj)


class NodeViewSet(viewsets.ModelViewSet):
    serializer_class = NodeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsNodeOwnerOrMapOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['content']
    ordering_fields = ['created_at']
    ordering = ['created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Node.objects.select_related(
            'creator', 'map', 'map__creator',
        ).prefetch_related('attachments__uploaded_by', 'votes')

        if user.is_authenticated:
            queryset = queryset.filter(Q(map__is_public=True) | Q(map__creator=user))
        else:
            queryset = queryset.filter(map__is_public=True)

        map_id = self.request.query_params.get('map')
        if map_id:
            queryset = queryset.filter(map_id=map_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def destroy(self, request, *args, **kwargs):
        node = self.get_object()
        if node.is_root:
            return Response(
                {'detail': 'The root node cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(
        detail=True,
        methods=['post', 'delete'],
        permission_classes=[permissions.IsAuthenticated, CanContributeToMap],
        url_path='vote',
    )
    def vote(self, request, pk=None):
        node = self.get_object()

        if request.method == 'DELETE':
            deleted, _ = NodeVote.objects.filter(user=request.user, node=node).delete()
            if not deleted:
                return Response({'detail': 'No vote to remove.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(compute_vote_summary(node, request.user))

        vote_type = request.data.get('vote_type')
        if vote_type not in ('upvote', 'downvote'):
            return Response(
                {'vote_type': 'Must be "upvote" or "downvote".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vote, _created = NodeVote.objects.update_or_create(
            user=request.user,
            node=node,
            defaults={'vote_type': vote_type},
        )
        return Response(compute_vote_summary(node, request.user))


class EdgeViewSet(viewsets.ModelViewSet):
    serializer_class = EdgeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsEdgeOwnerOrMapOwnerOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Edge.objects.select_related(
            'creator', 'map', 'map__creator', 'source', 'target',
        )

        if user.is_authenticated:
            queryset = queryset.filter(Q(map__is_public=True) | Q(map__creator=user))
        else:
            queryset = queryset.filter(map__is_public=True)

        map_id = self.request.query_params.get('map')
        if map_id:
            queryset = queryset.filter(map_id=map_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class NodeAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = NodeAttachmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAttachmentOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.OrderingFilter]
    ordering = ['created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = NodeAttachment.objects.select_related(
            'node', 'node__map', 'node__map__creator', 'uploaded_by',
        )

        if user.is_authenticated:
            queryset = queryset.filter(
                Q(node__map__is_public=True) | Q(node__map__creator=user)
            )
        else:
            queryset = queryset.filter(node__map__is_public=True)

        node_id = self.request.query_params.get('node')
        if node_id:
            queryset = queryset.filter(node_id=node_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
