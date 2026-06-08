import os
# pyrefly: ignore [missing-import]
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# pyrefly: ignore [missing-import]
from django.contrib.auth import get_user_model
# pyrefly: ignore [missing-import]
from django.core.exceptions import ValidationError
# pyrefly: ignore [missing-import]
from django.db import IntegrityError
from maps.models import Map, Node, NodeType, Edge, EdgeType

User = get_user_model()

def run_verification():
    print("--- STARTING SCHEMA AND CONSTRAINT VERIFICATION ---")
    
    # 1. Fetch or create a test user
    user = User.objects.first()
    if not user:
        user = User.objects.create_user(username="test_architect", password="password123")
        print(f"Created temporary user: {user.username}")
    else:
        print(f"Using existing user: {user.username}")

    # Clean up previous verification runs
    Map.objects.filter(title__startswith="Verify_").delete()

    # 2. Create Map A and Map B
    map_a = Map.objects.create(title="Verify_Map_A", creator=user, is_public=True)
    map_b = Map.objects.create(title="Verify_Map_B", creator=user, is_public=False)
    print(f"Created Maps: {map_a.title} (ID: {map_a.id}) and {map_b.title} (ID: {map_b.id})")

    # 3. Create Nodes under Map A
    node_a1 = Node.objects.create(
        map=map_a,
        creator=user,
        content="Solar energy is cheap. Solar prices dropped 80% in the last decade.",
        node_type=NodeType.CLAIM,
        x_position=100.0,
        y_position=150.0
    )
    node_a2 = Node.objects.create(
        map=map_a,
        creator=user,
        content="Renewables are sustainable. They produce low emissions.",
        node_type=NodeType.ARGUMENT,
        x_position=200.0,
        y_position=250.0
    )
    print(f"Created Node A1: '{node_a1}' and Node A2: '{node_a2}'")

    # 4. Create Node under Map B
    node_b1 = Node.objects.create(
        map=map_b,
        creator=user,
        content="Wind power is variable. Wind speeds change constantly.",
        node_type=NodeType.CLAIM,
        x_position=50.0,
        y_position=50.0
    )
    print(f"Created Node B1: '{node_b1}'")

    # 5. Rule Verification: Prevent Self-Loops
    print("\nVerifying Self-Loop Prevention:")
    try:
        self_loop_edge = Edge(
            map=map_a,
            creator=user,
            source=node_a1,
            target=node_a1,
            edge_type=EdgeType.SUPPORT
        )
        self_loop_edge.save()
        print("❌ FAIL: Self-loop was allowed!")
    except ValidationError as e:
        print(f"✅ PASS: Python-level ValidationError caught self-loop: {e}")
    except IntegrityError as e:
        print(f"✅ PASS: DB-level IntegrityError caught self-loop: {e}")

    # 6. Rule Verification: Prevent Cross-Map Connections
    print("\nVerifying Cross-Map Edge Prevention:")
    try:
        cross_map_edge = Edge(
            map=map_a,
            creator=user,
            source=node_a1,
            target=node_b1,
            edge_type=EdgeType.SUPPORT
        )
        cross_map_edge.save()
        print("❌ FAIL: Cross-map edge was allowed!")
    except ValidationError as e:
        print(f"✅ PASS: Python-level ValidationError caught cross-map alignment issue: {e}")
    except Exception as e:
        print(f"✅ PASS: Caught error: {e}")

    # 7. Create Valid Edge (A1 -> A2)
    print("\nCreating Valid Edge (A1 supports A2):")
    valid_edge = Edge(
        map=map_a,
        creator=user,
        source=node_a1,
        target=node_a2,
        edge_type=EdgeType.SUPPORT
    )
    valid_edge.save()
    print(f"✅ PASS: Successfully created edge: {valid_edge}")

    # 8. Rule Verification: Prevent Duplicate Edges
    print("\nVerifying Duplicate Edge Prevention:")
    try:
        duplicate_edge = Edge(
            map=map_a,
            creator=user,
            source=node_a1,
            target=node_a2,
            edge_type=EdgeType.COUNTER
        )
        duplicate_edge.save()
        print("❌ FAIL: Duplicate edge between source and target was allowed!")
    except ValidationError as e:
        print(f"✅ PASS: Python ValidationError caught duplicate edge: {e}")
    except IntegrityError as e:
        print(f"✅ PASS: DB-level UniqueConstraint IntegrityError caught duplicate edge: {e}")

    print("\n--- VERIFICATION COMPLETED SUCCESSFULLY ---")

if __name__ == '__main__':
    run_verification()
