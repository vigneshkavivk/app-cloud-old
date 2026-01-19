import streamlit as st
from streamlit_chat import message

st.set_page_config(page_title="DevOps Assistant", page_icon="🤖", layout="wide")
st.title("🤖 DevOps Assistant Bot")

if "messages" not in st.session_state:
    st.session_state.messages = []

# Display messages with unique keys
for i, msg in enumerate(st.session_state.messages):
    message(msg["content"], is_user=msg["is_user"], key=f"msg_{i}")

# Chat input
user_input = st.chat_input("Ask me anything about DevOps...")
if user_input:
    st.session_state.messages.append({"content": user_input, "is_user": True})

    # Dummy bot reply (replace with real logic)
    reply = f"🤖 I received: '{user_input}' — I'll help you with that!"
    st.session_state.messages.append({"content": reply, "is_user": False})

