# pyrefly: ignore [missing-import]
from rest_framework import permissions


def _can_read_map(map_obj, user):
    return map_obj.is_public or (user.is_authenticated and map_obj.creator == user)


class IsMapOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return _can_read_map(obj, request.user)
        return request.user.is_authenticated and obj.creator == request.user


class IsNodeOwnerOrMapOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return _can_read_map(obj.map, request.user)
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return obj.creator == request.user or obj.map.creator == request.user
        return obj.creator == request.user


class IsEdgeOwnerOrMapOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return _can_read_map(obj.map, request.user)
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return obj.creator == request.user or obj.map.creator == request.user
        return obj.creator == request.user


class IsAttachmentOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return _can_read_map(obj.node.map, request.user)
        if not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return (
                obj.uploaded_by == request.user
                or obj.node.creator == request.user
                or obj.node.map.creator == request.user
            )
        return obj.uploaded_by == request.user


class CanContributeToMap(permissions.BasePermission):
    """Authenticated users who can add content to a map."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
