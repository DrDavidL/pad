"""
Test script for Vera API - demonstrates the complete user flow
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"


def test_research_id_validation():
    """Step 1: Validate research ID"""
    print("\n" + "="*60)
    print("STEP 1: Validating Research ID")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/auth/validate-research-id",
        json={"research_id": "RID001"}
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.json()["valid"]


def test_disclaimer_acknowledgment():
    """Step 2: Acknowledge disclaimer"""
    print("\n" + "="*60)
    print("STEP 2: Acknowledging Disclaimer")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/auth/acknowledge-disclaimer",
        json={
            "research_id": "RID001",
            "acknowledged": True
        }
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.json()["success"]


def test_login():
    """Step 3: Login and get JWT token"""
    print("\n" + "="*60)
    print("STEP 3: Logging In (Getting JWT Token)")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"research_id": "RID001"}
    )

    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")

    return data["access_token"]


def test_send_message(token):
    """Step 4: Send a message to Vera"""
    print("\n" + "="*60)
    print("STEP 4: Sending Message to Vera")
    print("="*60)

    conversation_id = f"conv_{datetime.now().strftime('%Y%m%d%H%M%S')}_RID001"

    response = requests.post(
        f"{BASE_URL}/chat/message",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "research_id": "RID001",
            "conversation_id": conversation_id,
            "content": "What is peripheral artery disease?",
            "model": "gpt-4o"
        }
    )

    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"\nUser Message: What is peripheral artery disease?")
    print(f"\nVera's Response:\n{data['content'][:500]}...")
    print(f"\nFull Response Data: {json.dumps({k: v for k, v in data.items() if k != 'content'}, indent=2)}")

    return conversation_id


def test_get_history(token, conversation_id):
    """Step 5: Retrieve conversation history"""
    print("\n" + "="*60)
    print("STEP 5: Retrieving Conversation History")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/chat/history",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "research_id": "RID001",
            "conversation_id": conversation_id,
            "limit": 10
        }
    )

    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Total Messages: {data['total']}")
    print(f"Number of Messages Retrieved: {len(data['messages'])}")

    for i, msg in enumerate(data['messages'], 1):
        print(f"\n  Message {i}:")
        print(f"    Role: {msg['role']}")
        print(f"    Content: {msg['content'][:100]}...")
        print(f"    Timestamp: {msg['timestamp']}")


def test_admin_stats():
    """Bonus: Get admin statistics"""
    print("\n" + "="*60)
    print("BONUS: Admin Statistics")
    print("="*60)

    response = requests.post(
        f"{BASE_URL}/admin/stats",
        json={"password": "phPH3sA!"}  # Admin password from .env
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def main():
    """Run complete test flow"""
    print("\n" + "#"*60)
    print("# VERA API - COMPLETE USER FLOW TEST")
    print("#"*60)

    try:
        # Step 1: Validate Research ID
        if not test_research_id_validation():
            print("\n❌ Research ID validation failed!")
            return

        # Step 2: Acknowledge Disclaimer
        if not test_disclaimer_acknowledgment():
            print("\n❌ Disclaimer acknowledgment failed!")
            return

        # Step 3: Login
        token = test_login()
        if not token:
            print("\n❌ Login failed!")
            return

        # Step 4: Send Message
        conversation_id = test_send_message(token)

        # Step 5: Get History
        test_get_history(token, conversation_id)

        # Bonus: Admin Stats
        test_admin_stats()

        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"\nYou can view the interactive API docs at:")
        print(f"  http://localhost:8000/docs")
        print(f"\nAlternative docs (ReDoc):")
        print(f"  http://localhost:8000/redoc")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
