from .models import Map, Node, NodeType


def create_root_node(map_obj: Map) -> Node:
    """Create the permanent center root node for a map."""
    return Node.objects.create(
        map=map_obj,
        creator=map_obj.creator,
        content=map_obj.title,
        node_type=NodeType.CLAIM,
        is_root=True,
        x_position=0.0,
        y_position=0.0,
    )


def sync_root_node_title(map_obj: Map) -> None:
    """Keep root node content in sync with the map title."""
    Node.objects.filter(map=map_obj, is_root=True).update(content=map_obj.title)
