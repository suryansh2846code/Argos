# pyrefly: ignore [missing-import]
from django.urls import path, include
# pyrefly: ignore [missing-import]
from rest_framework.routers import DefaultRouter
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .auth_views import RegisterView, CurrentUserView, LogoutView
from .views import MapViewSet, NodeViewSet, EdgeViewSet, NodeAttachmentViewSet

router = DefaultRouter()
router.register(r'maps', MapViewSet, basename='map')
router.register(r'nodes', NodeViewSet, basename='node')
router.register(r'edges', EdgeViewSet, basename='edge')
router.register(r'attachments', NodeAttachmentViewSet, basename='attachment')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('', include(router.urls)),
]
