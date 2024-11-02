import streamlit as st
from datetime import datetime
import psycopg2
from psycopg2 import sql

# Database configuration
DATABASE_URL = st.secrets["DATABASE_URL"]

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
