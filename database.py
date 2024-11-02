# database.py
import psycopg2
from datetime import datetime
import streamlit as st

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

def check_password():
    """Returns `True` if the user has entered the correct password."""

    def password_entered():
        """Checks whether the entered password is correct."""
        st.session_state["password_correct"] = st.session_state["password"] == st.secrets["password"]

    if "password_correct" not in st.session_state:
        # First run, show input for password.
        st.text_input("Password", type="password", on_change=password_entered, key="password")
        st.write("*Please contact David Liebovitz, MD if you need an updated password for access.*")
        return False
    elif not st.session_state["password_correct"]:
        # Password not correct, show input + error.
        st.text_input("Password", type="password", on_change=password_entered, key="password")
        st.error("😕 Password incorrect")
        return False
    else:
        # Password correct.
        return True
    