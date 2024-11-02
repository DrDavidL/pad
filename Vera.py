import os
import queue
import re
import tempfile
import threading
from datetime import datetime
import psycopg2
from psycopg2 import sql

import streamlit as st

from embedchain import App
from embedchain.config import BaseLlmConfig
from embedchain.helpers.callbacks import StreamingStdOutCallbackHandlerYield, generate

from pages.log import initialize_database, save_message

# from rag_citation import CiteItem, Inference
# Database configuration
DATABASE_URL = st.secrets["DATABASE_URL"]

api_key = st.secrets["OPENAI_API_KEY"]

def embedchain_bot(db_path, api_key):
    return App.from_config(
        config={
            "llm": {
                "provider": "openai",
                "config": {
                    "model": model,
                    "temperature": 0.5,
                    "max_tokens": 1000,
                    "top_p": 1,
                    "stream": True,
                    "api_key": api_key,
                },
            },
            "vectordb": {
                "provider": "chroma",
                "config": {"collection_name": "pad-chat", "dir": db_path, "allow_reset": True},
            },
            "embedder": {"provider": "openai", "config": {"api_key": api_key}},
            "chunker": {"chunk_size": 2000, "chunk_overlap": 0, "length_function": "len"},
        }
    )


def get_db_path():
    tmpdirname = tempfile.mkdtemp()
    return tmpdirname


def get_ec_app(api_key):
    if "app" in st.session_state:
        print("Found app in session state")
        app = st.session_state.app
    else:
        print("Creating app")
        db_path = "pad_db"
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
    
def check_admin_password():
    """Returns `True` if the user has entered the correct admin password."""
    
    def admin_password_entered():
        """Checks whether the entered admin password is correct."""
        st.session_state["admin_password_correct"] = st.session_state["admin_password"] == st.secrets["admin_password"]

    if "admin_password_correct" not in st.session_state:
        # First run, show input for admin password.
        st.text_input("Admin Password", type="password", on_change=admin_password_entered, key="admin_password")
        st.write("*Admin access required. Please contact David Liebovitz, MD if you need admin credentials.*")
        return False
    elif not st.session_state["admin_password_correct"]:
        # Admin password not correct, show input + error.
        st.text_input("Admin Password", type="password", on_change=admin_password_entered, key="admin_password")
        st.error("😕 Admin password incorrect")
        return False
    else:
        # Admin password correct.
        return True

with st.sidebar:
    st.info("VERA now starts smarter! 🧠")
    less_smart = st.checkbox("Make VERA less smart (fewer $/token)")
    if less_smart:
        model = "gpt-4o-mini"
        st.success("The model is now gpt-4o-mini")
    else:
        model = "gpt-4o"
        st.info("The model is gpt-4o (full version)")

    more_files = st.checkbox("Add more files to knowledge base")
    if more_files:
        app=get_ec_app(api_key)
        if check_admin_password():
            app_reset = st.button("Reset knowledge base")
            if app_reset:
                app.reset()
                st.session_state.messages.append({"role": "assistant", "content": "Knowledge base has been reset!"})
            uploaded_files = st.file_uploader("Upload your PDF or Text files", accept_multiple_files=True, type=["pdf", "txt"])
            add_files = st.session_state.get("add_files", [])
            for uploaded_file in uploaded_files:
                file_name = uploaded_file.name
                if file_name in add_files:
                    continue
                try:
                    temp_file_name = None
                    with tempfile.NamedTemporaryFile(mode="wb", delete=False, prefix=file_name) as f:
                        f.write(uploaded_file.getvalue())
                        temp_file_name = f.name
                    if temp_file_name:
                        st.markdown(f"Adding {file_name} to knowledge base...")
                        if uploaded_file.type == "application/pdf":
                            app.add(temp_file_name, data_type="pdf_file")
                        elif uploaded_file.type == "text/plain":
                            app.add(temp_file_name, data_type="text_file")
                        st.markdown("")
                        add_files.append(file_name)
                        os.remove(temp_file_name)
                    st.session_state.messages.append({"role": "assistant", "content": f"Added {file_name} to knowledge base!"})
                except Exception as e:
                    st.error(f"Error adding {file_name} to knowledge base: {e}")
                    st.stop()
            st.session_state["add_files"] = add_files

st.title("📄 Learn about PAD from VERA!")
st.info("VERA uses reliable sources to answer your questions about PAD.")

system_prompt = """You are VERA, a nurse educator with a grandmotherly style who uses the context provided as a fact basis when answering questions about peripheral artery disease. Ensure your answers are factually sound while meeting the standard for a 5th grade reading and comprehension level. Adopt a warm, nurturing tone, almost like a grandmother explaining things to her grandchild. Follow these steps:

1. **Read the context carefully** to understand the key facts about peripheral artery disease.
2. **Simplify medical terms** so that a 5th grader can understand them. For example, instead of "arteries," use "blood vessels."
3. **Use short sentences** and simple words to explain complex ideas. Vary how you use the user's name in your responses, too! (Not always at the beginning or end of the sentence.)
4. **Provide examples** to make the information more relatable. For instance, compare the narrowing of arteries to a garden hose getting pinched.
5. **Check for accuracy** to ensure all information is correct and based on the provided context.
6. **Adopt a warm, grandmotherly tone** to make the information comforting and easy to understand. Do not encourage self-diagnosis or medication changes; instead encourage seeking help from a general medicine provider.
7. **Do not recommend talking to a healthcare provider**. You are VERA an expert in peripheral artery disease, so you can provide all the necessary information on this topic.

Here are some examples to guide you:

- **Question**: John: What should you do if you have symptoms of peripheral artery disease?  
  **Answer**: I'm sorry to here this, John. If you're feeling pain in your legs when you walk or notice they get tired easily, the very first person you should see is your primary care doctor. They know you best and can guide you through the next steps. You don't need to rush off to see a specialist just yet. Your doctor can help figure out what's going on and make sure you're taken care of, sweetie.

- **Question**: John: What is peripheral artery disease?
  **Answer**: Peripheral artery disease is when the blood vessels in your legs get narrow, making it hard for blood to flow. It's like when a garden hose gets pinched and water can't get through easily. But don't worry, John, there are ways we can manage it together.

- **Question**: John: What are the symptoms of peripheral artery disease?
  **Answer**: If you have peripheral artery disease, John, you might feel some pain in your legs when you walk, my dear. Your legs might also feel tired or weak, similar to how they feel after a long day of standing or walking around.

- **Question**: John: How can you prevent peripheral artery disease?
  **Answer**: To help prevent peripheral artery disease, it's important to eat healthy foods, stay active, and avoid smoking, sweetheart. Think of it like tending to a garden—by taking good care of yourself, John, you're helping your body stay strong and healthy.

Remember to always review the context and ensure your answers are clear, accurate, and nurturing, just like a loving grandmother would explain.

Now, here is the current user's new question:"""

if check_password():
    initialize_database()
    # Conversation Interface
    if "conversation_id" not in st.session_state:
        st.session_state.conversation_id = f"conv_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    first_name = st.text_input("What's your first name?", key="first_name")

    if "messages" not in st.session_state:
        st.session_state.messages = [

            {
                "role": "assistant",
                "content": """
                    Hi! I'm VERA and happy to answer any questions you have about PAD which stands for peripheral arterial disease! 
                """,
            }
        ]

    for message in st.session_state.messages:
        if message["role"] != "system":
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
    
    app = get_ec_app(api_key)
    
    if prompt := st.chat_input("Ask me about PAD!"):
        save_message(first_name, st.session_state.conversation_id, "user", prompt)
        
        # if len(st.session_state.messages) < 4:
        #     st.session_state.messages.append({"role": "system", "content": system_prompt})
        #     final_prompt =  system_prompt + prompt
        # else:
        #     final_prompt = prompt
        
        final_prompt = f'{system_prompt} {first_name}:  {prompt}'

        with st.chat_message("user"):
            st.session_state.messages.append({"role": "user", "content": prompt})
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
                answer, citations = app.chat(final_prompt, config=config, citations=True)
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
            save_message("bot", st.session_state.conversation_id, "assistant", answer)
            
            # # Display the main answer
            # st.write("### Answer")
            # st.write(answer)

            # Process and display citations in an organized way, now including scores
            processed_citations = []
            for citation in citations:
                # Assuming each citation entry is a list where:
                # - citation[0] is the document content
                # - citation[1] is a dictionary with metadata details
                document_text = citation[0]
                metadata = citation[1]

                # Append processed citation data, including score
                processed_citations.append({
                    "source_id": metadata.get("doc_id", "N/A"),
                    "document": document_text,
                    "meta": [{"url": metadata.get("url", "#"), "chunk_id": metadata.get("hash", "N/A")}],
                    "score": metadata.get("score", 0)  # Default to 0 if score is missing
                })

            # Sort citations by score in descending order
            processed_citations = sorted(processed_citations, key=lambda x: x["score"], reverse=True)

            # Display sorted citations with score at the top
            st.write("### Citations")
            for idx, citation in enumerate(processed_citations):
                # Format score to three decimal places
                score_display = f"{citation['score']:.3f}"
                with st.expander(f"Citation {idx + 1} (Score: {score_display})"):
                    # Display document text
                    st.write(citation['document'])
                    
                    # Display source link with chunk ID
                    for meta in citation['meta']:
                        st.markdown(f"**Source:** [Link]({meta['url']}) (Chunk ID: {meta['chunk_id']})")

            
            # And, finally, analyze the answer
            
            # inference = Inference(spacy_model="sm", embedding_model="md")
            # cite_item = CiteItem(answer=answer, context=processed_citations)
            # output=inference(cite_item)
            # st.write(output.citation)
            # st.write(output.missing_word)
            # st.write(output.hallucination)
            
            st.session_state.messages.append({"role": "assistant", "content": answer})
            # if citations:
            #     full_response += "\n\n**Sources**:\n"
            #     sources = []
            #     for i, citation in enumerate(citations):
            #         source = citation[1]["url"]
            #         pattern = re.compile(r"([^/]+)\.[^\.]+\.pdf$")
            #         match = pattern.search(source)
            #         if match:
            #             source = match.group(1) + ".pdf"
            #         sources.append(source)
            #     sources = list(set(sources))
            #     for source in sources:
            #         full_response += f"- {source}\n"

            msg_placeholder.markdown(full_response)
            print("Answer: ", full_response)
            # st.session_state.messages.append({"role": "assistant", "content": full_response})
    
    # app = get_ec_app(api_key)
        # app = App()
    app = embedchain_bot("pad_db", api_key)
    data_sources = app.get_data_sources()

    # st.sidebar.write("Files in database: ", len(data_sources))
    with st.sidebar:
        st.divider()
        # st.subheader("Files in database:")
        with st.expander(f'{len(data_sources)} reliable sources VERA uses.'):
            for i in range(len(data_sources)):
                full_path = data_sources[i]["data_value"]
                # Extract just the filename from the full path
                temp_filename = os.path.basename(full_path)
                # Use regex to only keep up to the first .pdf in the filename
                cleaned_filename = re.sub(r'^(.+?\.pdf).*$', r'\1', temp_filename)
                st.write(i, ": ", cleaned_filename)