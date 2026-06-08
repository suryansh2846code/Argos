# pyrefly: ignore [missing-import]
from django.contrib import admin
# pyrefly: ignore [missing-import]
from django.db.models import Count
from .models import Map, Node, Edge

class NodeInline(admin.TabularInline):
    model = Node
    extra = 1
    fields = ('content', 'node_type', 'creator', 'x_position', 'y_position')
    raw_id_fields = ('creator',)
    show_change_link = True


class EdgeInline(admin.TabularInline):
    model = Edge
    extra = 1
    fk_name = 'source'
    fields = ('target', 'edge_type', 'creator')
    raw_id_fields = ('target', 'creator')
    show_change_link = True


@admin.register(Map)
class MapAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'is_public', 'created_at', 'updated_at', 'nodes_count', 'edges_count')
    list_filter = ('is_public', 'created_at', 'creator')
    search_fields = ('title', 'description', 'creator__username')
    raw_id_fields = ('creator',)
    inlines = [NodeInline]

    def get_queryset(self, request):
        """
        Optimize queryset to count related nodes and edges in a single query (avoiding N+1).
        """
        queryset = super().get_queryset(request)
        return queryset.annotate(
            _nodes_count=Count('nodes', distinct=True),
            _edges_count=Count('edges', distinct=True)
        )

    def nodes_count(self, obj):
        return obj._nodes_count
    nodes_count.admin_order_field = '_nodes_count'
    nodes_count.short_description = 'Nodes'

    def edges_count(self, obj):
        return obj._edges_count
    edges_count.admin_order_field = '_edges_count'
    edges_count.short_description = 'Edges'


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'node_type', 'map', 'creator', 'x_position', 'y_position', 'created_at')
    list_filter = ('node_type', 'created_at', 'map')
    search_fields = ('content', 'creator__username', 'map__title')
    raw_id_fields = ('map', 'creator')
    inlines = [EdgeInline]


@admin.register(Edge)
class EdgeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'map', 'edge_type', 'creator', 'created_at')
    list_filter = ('edge_type', 'created_at', 'map')
    search_fields = ('source__content', 'target__content', 'creator__username', 'map__title')
    raw_id_fields = ('map', 'source', 'target', 'creator')
