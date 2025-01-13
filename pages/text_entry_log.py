import streamlit as st
from datetime import datetime
import psycopg2
from psycopg2 import sql
import requests

# log.py
from database import initialize_database, save_message, retrieve_conversations_by_filters, check_password
# rest of your code


# Database configuration
DATABASE_URL = st.secrets["DATABASE_URL"]

# Function to convert Unix timestamp to human-readable date
def unix_to_date(unix_time):
    return datetime.utcfromtimestamp(unix_time).strftime('%Y-%m-%d %H:%M:%S')

# Fetch all conversations
def fetch_conversations(agent_id):
    url = f"{BASE_URL}/conversations"
    querystring = {"agent_id": agent_id}
    response = requests.get(url, headers=HEADERS, params=querystring)
    if response.status_code == 200:
        return response.json().get("conversations", [])
    else:
        st.error("Error fetching conversations.")
        return []

# Fetch a single conversation's details
def fetch_conversation_details(conversation_id):
    url = f"{BASE_URL}/conversations/{conversation_id}"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Error fetching conversation details.")
        return {}

# Function to connect to the PostgreSQL database
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# Initialize database and create tables if they do not exist
def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255),
        timestamp TIMESTAMP,
        conversation_id VARCHAR(255),
        role VARCHAR(10),
        content TEXT
    );
    """)
    conn.commit()
    cursor.close()
    conn.close()

# Save a message to the database
def save_message(user_name, conversation_id, role, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now()
    cursor.execute("""
    INSERT INTO conversations (user_name, timestamp, conversation_id, role, content)
    VALUES (%s, %s, %s, %s, %s);
    """, (user_name, timestamp, conversation_id, role, content))
    conn.commit()
    cursor.close()
    conn.close()

# Retrieve conversations by date range and optional filters for user name or conversation ID
def retrieve_conversations_by_filters(start_date, end_date, user_name=None, conversation_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure start_date and end_date include time component
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    # Logging to confirm date and time handling
    print(f"Searching from {start_datetime} to {end_datetime}")

    # Build the query dynamically based on provided filters
    query = """
    SELECT user_name, timestamp, conversation_id, role, content 
    FROM conversations
    WHERE timestamp BETWEEN %s AND %s
    """
    params = [start_datetime, end_datetime]

    if user_name:
        query += " AND user_name ILIKE %s"
        params.append(f"%{user_name}%")
    
    if conversation_id:
        query += " AND conversation_id = %s"
        params.append(conversation_id)

    query += " ORDER BY conversation_id, timestamp;"

    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return results

# Streamlit UI
st.title("Conversation Log")
initialize_database()
if check_password():
    # initialize_database()

    if st.checkbox("Log for Text Entries"):
    
        # Date range and search filters
        st.subheader("Retrieve Conversations by Date Range and Filters")
        start_date = st.date_input("Start Date", value=datetime.now().date())
        end_date = st.date_input("End Date", value=datetime.now().date())
        user_name = st.text_input("User Name (optional)")
        conversation_id = st.text_input("Conversation ID (optional)")

        # Validate date range
        if start_date > end_date:
            st.error("Start date cannot be after end date.")
        else:
            conversations = retrieve_conversations_by_filters(start_date, end_date, user_name, conversation_id)
            if conversations:
                # Organize results by conversation ID
                conversation_threads = {}
                for user_name, timestamp, conv_id, role, content in conversations:
                    if conv_id not in conversation_threads:
                        conversation_threads[conv_id] = []
                    conversation_threads[conv_id].append((user_name, timestamp, role, content))

                # Display each conversation in an organized, expandable format
                for conv_id, messages in conversation_threads.items():
                    with st.expander(f"Conversation ID: {conv_id}"):
                        for user_name, timestamp, role, content in messages:
                            time_display = timestamp.strftime("%Y-%m-%d %H:%M:%S")
                            st.markdown(f"**{role.capitalize()}** ({user_name} - {time_display}): {content}")
            else:
                st.write("No conversations found for the selected criteria.")
                
    if st.checkbox("Log for Voice entries"):
        st.write("Voice entries log")
        
                # url = "https://api.elevenlabs.io/v1/convai/conversations"

        # querystring = {"agent_id":st.secrets["agent_id"]}

        # headers = {"xi-api-key": st.secrets["elevenlabs_api_key"]}

        # response = requests.get(url, headers=headers, params=querystring)

        # st.json(response.json())






        # API Endpoints
        BASE_URL = "https://api.elevenlabs.io/v1/convai"
        HEADERS = {"xi-api-key": st.secrets["elevenlabs_api_key"]}



        # Streamlit UI
        st.title("Voice Conversation Log")

        # Input fields
        agent_id = st.secrets["agent_id"]
        # agent_id = st.text_input("Agent ID", placeholder="Enter the agent ID", value=st.secrets["agent_id"])
        min_duration = st.number_input("Minimum Call Duration (seconds)", min_value=0, value=10)

        if agent_id:
            conversations = fetch_conversations(agent_id)
            
            # Filter by minimum duration
            filtered_conversations = [
                convo for convo in conversations 
                if convo["call_duration_secs"] >= min_duration
            ]
            
            # Sort by start time (reverse chronological)
            filtered_conversations.sort(key=lambda x: x["start_time_unix_secs"], reverse=True)
            
            # Display conversations
            for convo in filtered_conversations:
                start_time = unix_to_date(convo["start_time_unix_secs"])
                with st.expander(f"Message Count: {convo['message_count']} Date: {start_time}"):
                    st.write(f"Message Count: {convo['message_count']}")
                    st.write(f"Conversation ID: {convo['conversation_id']}")
                    st.write(f"Agent Name: {convo['agent_name']}")
                    st.write(f"Call Duration: {convo['call_duration_secs']} seconds")
                    
                    
                    # Fetch and display detailed conversation
                    if st.button(f"View Details of {convo['conversation_id']}", key=convo['conversation_id']):
                        details = fetch_conversation_details(convo["conversation_id"])
                        if details:
                            transcript = details.get("transcript", [])
                            for message in transcript:
                                role = message["role"]
                                time_in_call = message["time_in_call_secs"]
                                content = message["message"]
                                st.write(f"**{role.capitalize()}** (At {time_in_call}s): {content}")
