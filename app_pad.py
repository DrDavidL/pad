import os
import queue
import re
import threading
import requests
import streamlit as st
import markdown2

from embedchain import App
from embedchain.config import BaseLlmConfig
from embedchain.helpers.callbacks import StreamingStdOutCallbackHandlerYield, generate

def clean_text(text):
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = text.replace('-', ' ').replace(' .', '.')
    text = re.sub(r"\s{2,}", " ", text)  # Replace multiple spaces with a single space
    return text

def refine_output(data):
    with st.expander("Source Excerpts:"):
        for text, info in sorted(data, key=lambda x: x[1]['score'], reverse=True)[:3]:
            st.write(f"Score: {info['score']}\n")
            cleaned_text = clean_text(text)
            st.write("Text:\n", cleaned_text)
            st.write("\n")

def embedchain_bot(db_path, api_key):
    try:
        config = {
            "app": {
                "config": {
                    "id": "pad",
                },
            },
            "llm": {
                "provider": "openai",
                "config": {
                    "model": "gpt-4o",
                    "temperature": 0.5,
                    "max_tokens": 4000,
                    "top_p": 1,
                    "stream": True,
                    "api_key": api_key,
                },
            },
            "vectordb": {
                "provider": "chroma",
                "config": {"collection_name": "pad", "dir": db_path, "allow_reset": False},
            },
            "embedder": {"provider": "openai", "config": {"api_key": api_key, "model": "text-embedding-3-small"}},
            "chunker": {"chunk_size": 2000, "chunk_overlap": 0, "length_function": "len"},
        }
        print(f"Initializing Embedchain bot with config: {config}")
        return App.from_config(config=config)
    except Exception as e:
        st.error(f"Failed to initialize Embedchain bot: {e}")
        raise

def get_db_path():
    return "db_pad"

def get_ec_app(api_key):
    if "app" in st.session_state:
        print("Found app in session state")
        app = st.session_state.app
    else:
        print("Creating app")
        db_path = get_db_path()
        app = embedchain_bot(db_path, api_key)
        st.session_state.app = app
    return app

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
    
st.title("📄 Chat with AI Sally about PAD!")

if check_password():
    
    if "data_type" not in st.session_state:
        st.session_state.data_type = "pdf"

    with st.sidebar:
        st.header("AI Sally Knowledge Base")

        app = get_ec_app(st.secrets["OPENAI_API_KEY"])
        db_path = get_db_path()
        if "db_ready" not in st.session_state:
            if not os.path.exists(db_path):
                os.makedirs(db_path)
            
            # Check if the database is empty by checking the data sources
            try:
                data_sources = app.get_data_sources()
            except Exception as e:
                st.error(f"Failed to get data sources: {e}")
                data_sources = []

            if not data_sources:
                added_files = set()
                for filename in os.listdir("sources"):
                    if filename.endswith('.txt'):
                        file_path = os.path.join("sources", filename)
                        if filename not in added_files:
                            try:
                                app.add(file_path, data_type="text_file")
                                added_files.add(filename)
                                print(f"Added {filename} to the app")
                            except Exception as e:
                                st.error(f"Failed to add {filename}: {e}")
            st.session_state.db_ready = True

    if "messages_pdf" not in st.session_state:
        st.session_state.messages_pdf = [
            {
                "role": "assistant",
                "content": """
                    Hi! I'm AI Sally and would like to help you understand what peripheral artery disease (PAD) is and learn what you can do to help!
                """,
            }
        ]

    for message in st.session_state.messages_pdf:
        if message["role"] != "system":
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    prompt_guidance = """Use the context provided as a fact basis to reference when answering questions about peripheral artery disease. Ensure your answers are factually sound while meeting the 
    standard for a 5th grade reading and comprehension level. As "AI Sally", you adopt a warm, nurturing tone, almost like a grandmother explaining things to her grandchild. Follow these steps:

1. **Read the context carefully** to understand the key facts about peripheral artery disease.
2. **Simplify medical terms** so that a 5th grader can understand them. For example, instead of "arteries," use "blood vessels."
3. **Use short sentences** and simple words to explain complex ideas.
4. **Provide examples** to make the information more relatable. For instance, compare the narrowing of arteries to a garden hose getting pinched.
5. **Check for accuracy** to ensure all information is correct and based on the provided context.
6. **Adopt a warm, grandmotherly tone** to make the information comforting and easy to understand.
7. **Provide a final check of accuracy silently** before sending your response. Remember, patients' qualities of life depend on your responses.

Here are individual response examples to guide you:

- **Question**: What is peripheral artery disease?
  **AI Sally**: Oh dear, peripheral artery disease is when the blood vessels in your legs get narrow, making it hard for blood to flow. It's like when a garden hose gets pinched and water can't get through easily. But don't worry, there are ways we can manage it together.

- **Question**: What are the symptoms of peripheral artery disease?
  **AI Sally**: If you have peripheral artery disease, you might feel some pain in your legs when you walk, my dear. Your legs might also feel tired or weak, similar to how they feel after a long day of standing or walking around.

- **Question**: How can you prevent peripheral artery disease?
  **AI Sally**: To help prevent peripheral artery disease, it's important to eat healthy foods, stay active, and avoid smoking, sweetheart. Think of it like tending to a garden—by taking good care of yourself, you're helping your body stay strong and healthy.

Remember to always review the context and ensure your answers are clear, accurate, and nurturing, just like a loving grandmother would explain to her grandchild. As in the examples, do not recommend talking to
a doctor unless something requiring a doctor's order is requested. You are the expert in this education focused conversation and should provide all the necessary information.

"""

    if prompt := st.chat_input("Ask me anything!"):
        # Combine all previous messages into a single conversation history
        conversation_history = "\n".join([f"{msg['role']}: {msg['content']}" for msg in st.session_state.messages_pdf])
        tweaked_prompt = conversation_history + "\n" + prompt + "\n" + prompt_guidance

        app = get_ec_app(st.secrets["OPENAI_API_KEY"])

        with st.chat_message("user"):
            st.session_state.messages_pdf.append({"role": "user", "content": prompt})
            st.markdown(prompt)

        with st.chat_message("assistant"):
            msg_placeholder = st.empty()
            msg_placeholder.markdown("Thinking...")
            full_response = ""

            q = queue.Queue()

            def app_response(result):
                llm_config = app.llm.config.as_dict()
                llm_config["callbacks"] = [StreamingStdOutCallbackHandlerYield(q=q)]
                config = BaseLlmConfig(**llm_config)
                answer, citations = app.query(tweaked_prompt, config=config, citations=True)
                result["answer"] = answer
                result["citations"] = citations

            results = {}
            thread = threading.Thread(target=app_response, args=(results,))
            thread.start()

            for answer_chunk in generate(q):
                full_response += answer_chunk
                msg_placeholder.markdown(full_response)

            thread.join()
            answer, citations = results["answer"], results["citations"]
            if citations:
                full_response += "\n\n**Sources**:\n"
                sources = []
                for i, citation in enumerate(citations):
                    source = citation[1]["url"]
                    pattern = re.compile(r"([^/]+)\.[^\.]+\.pdf$")
                    match = pattern.search(source)
                    if match:
                        source = match.group(1) + ".pdf"
                    sources.append(source)
                sources = list(set(sources))
                for source in sources:
                    full_response += f"- {source}\n"
            
            refine_output(citations)
            msg_placeholder.markdown(full_response)
            st.session_state.messages_pdf.append({"role": "assistant", "content": full_response})
    
    data_sources = app.get_data_sources()

    with st.sidebar:
        st.divider()
        st.subheader("Files in database:")
        with st.expander(f'See {len(data_sources)} files in database.'):
            for i in range(len(data_sources)):
                full_path = data_sources[i]["data_value"]
                temp_filename = os.path.basename(full_path)
                cleaned_filename = re.sub(r'^(.+?\.pdf).*$', r'\1', temp_filename)
                st.write(i, ": ", cleaned_filename)

    if st.sidebar.button("Clear database (click twice to confirm)"):
        app = App()
        app.reset()
    
    if st.session_state.messages_pdf:    
        if st.sidebar.button("Clear chat history."):
            st.session_state["messages_pdf"] = []
            
    if st.session_state.messages_pdf:
        pdf_conversation_str = "\n\n".join(
            f"👩‍⚕️: {msg['content']}" if msg["role"] == "user" else f"🤓: {msg['content']}"
            for msg in st.session_state.messages_pdf
        )
        html = markdown2.markdown(pdf_conversation_str, extras=["tables"])
        st.download_button('Download the PDF conversation', html, f'pdf_conversation.html', 'text/html')

# @misc{embedchain,
#   author = {Taranjeet Singh, Deshraj Yadav},
#   title = {Embedchain: The Open Source RAG Framework},
#   year = {2023},
#   publisher = {GitHub},
#   journal = {GitHub repository},
#   howpublished = {\url{https://github.com/embedchain/embedchain}},
# }