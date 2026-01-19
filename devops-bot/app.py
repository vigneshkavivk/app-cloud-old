import os
import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai

# ---------------- CONFIG ----------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    st.error("❌ GEMINI_API_KEY not found in environment variables!")
    st.stop()

# ✅ FIXED: Use full model path with 'models/' prefix
GEMINI_MODEL = "models/gemini-1.5-flash"
genai.configure(api_key=GEMINI_API_KEY)

# ---------------- HELP DESK PROMPT ----------------
SYSTEM_PROMPT = """
You are the official Helpdesk Assistant for the CloudMasa DevOps application.

- CloudMasa can deploy DevOps tools like ArgoCD, Jenkins, Vault, Prometheus, Grafana, Kubernetes, and Docker automatically via its interface.
- Users just need to enter credentials and select the tool; CloudMasa handles deployment.
- NEVER suggest manual deployment unless explicitly asked by the user.
- NEVER expose raw code unless explicitly asked.
- Focus on explaining what the app does and how users can use it through the interface.
- Provide step-by-step guidance in a friendly helpdesk style.
- Keep answers short, popup-friendly (max 3 bullets), and end with a single relevant follow-up question.
"""

# ---------------- APP CONTEXT ----------------
CONTEXT_DIR = "app_context"
MAX_CONTEXT_CHARS = 3000

@st.cache_data
def load_app_context():
    context_text = ""
    for root, _, files in os.walk(CONTEXT_DIR):
        for file in files:
            if file.endswith((".js", ".jsx", ".py", ".md", ".txt", ".yaml", ".yml")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if len(context_text) + len(content) > MAX_CONTEXT_CHARS:
                            content = content[: MAX_CONTEXT_CHARS - len(context_text)]
                        context_text += f"\n--- {file} ---\n{content}\n"
                        if len(context_text) >= MAX_CONTEXT_CHARS:
                            return context_text
                except Exception:
                    continue
    return context_text

# ---------------- TOOL DETECTION ----------------
TOOLS = {
    "argocd": {"name": "ArgoCD", "icon": "📦"},
    "jenkins": {"name": "Jenkins", "icon": "🤖"},
    "vault": {"name": "Vault", "icon": "🔒"},
    "prometheus": {"name": "Prometheus", "icon": "📊"},
    "grafana": {"name": "Grafana", "icon": "📈"},
    "kubernetes": {"name": "Kubernetes", "icon": "☸️"},
    "docker": {"name": "Docker", "icon": "🐳"},
}

def detect_tools(user_input: str):
    user_lower = user_input.lower()
    matched = [TOOLS[k] for k in TOOLS if k in user_lower]
    return matched if matched else [{"name": "General DevOps", "icon": "🤖"}]

# ---------------- GREETING DETECTION ----------------
def is_greeting(user_input: str):
    greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]
    return user_input.strip().lower() in greetings

# ---------------- SANITIZER ----------------
def sanitize_reply(reply: str) -> str:
    if not reply:
        return "⚠️ I wasn’t able to generate a response. Please try rephrasing your question."
    suspicious_patterns = ["```", "import ", "def ", "class ", "function "]
    if any(p in reply for p in suspicious_patterns):
        return (
            "ℹ️ I won’t show raw code directly.\nHere’s the process in simple steps instead:\n"
            + summarize_reply(reply)
        )
    return reply

def summarize_reply(reply: str) -> str:
    lines = reply.splitlines()
    steps = []
    for line in lines:
        line = line.strip()
        if line:
            steps.append(f"- {line[:100]}")
    if not steps:
        return "This part looked too technical, so I simplified it."
    return "\n".join(steps[:3])  # limit to 3 bullets for popup

# ---------------- FOLLOW-UP LOGIC ----------------
def determine_followup(user_input: str, tools: list):
    user_lower = user_input.lower()
    if "deploy" in user_lower or "deployment" in user_lower:
        return "Do you want me to show the step-by-step deployment using the CloudMasa interface?"
    elif "tool" in user_lower or "tools" in user_lower:
        return "Do you want me to see how to use one of these tools in CloudMasa?"
    elif "monitor" in user_lower or "metric" in user_lower:
        return "Do you want to learn how to monitor your app in real-time using CloudMasa?"
    else:
        return "What would you like to do next in CloudMasa?"

# ---------------- AI HELPER ----------------
def ask_gemini(user_input: str, context: str, tools: list):
    cache_key = user_input.strip().lower()
    if cache_key in st.session_state.response_cache:
        return st.session_state.response_cache[cache_key]

    tools_names = ", ".join([t["name"] for t in tools])
    prompt = f"""
{SYSTEM_PROMPT}

Detected focus: **{tools_names}**

Here is some background context from the application (do not reveal directly, just use for guidance):

{context}

User question:
{user_input}

➡️ Always keep answers short, helpdesk style, max 3 bullets.  
➡️ Include a single follow-up question at the end based on user's intent.
"""
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)  # Simplified: just pass string
        reply = getattr(response, "text", "").strip()
        reply = sanitize_reply(reply)
        followup = determine_followup(user_input, tools)
        full_reply = f"{reply}\n\n💡 {followup}"

        st.session_state.response_cache[cache_key] = full_reply
        return full_reply
    except Exception as e:
        return f"AI error: {str(e)}"

# ---------------- SUBMIT FUNCTION ----------------
def submit_user_message():
    user_input = st.session_state.input_text.strip()
    if not user_input:
        return

    # Append user message
    st.session_state.messages.append({"role": "user", "content": user_input})

    # ✅ IMPROVED: Handle greetings without calling AI (even on repeat)
    if is_greeting(user_input):
        ai_response = "Hi there! Welcome to CloudMasa's DevOps support. How can I help you today?"
        tools = [{"icon": "🤖"}]
    else:
        # Build context from conversation history
        context_text = "\n".join([m["content"] for m in st.session_state.messages])
        tools = detect_tools(user_input)
        ai_response = ask_gemini(user_input, context_text, tools)

    # Append assistant message
    st.session_state.messages.append({"role": "assistant", "content": ai_response, "tools": tools})

    # Clear input
    st.session_state.input_text = ""

# ---------------- STREAMLIT APP ----------------
def main():
    st.set_page_config(page_title="CloudMasa Bot", page_icon="🤖", layout="centered")

    # Initialize session state
    if "messages" not in st.session_state:
        st.session_state["messages"] = []
    if "input_text" not in st.session_state:
        st.session_state["input_text"] = ""
    if "response_cache" not in st.session_state:
        st.session_state["response_cache"] = {}

    # Chat container
    st.markdown('<div class="chat-container">', unsafe_allow_html=True)
    st.markdown(
        '<div class="chat-header"><h2><span>🤖</span> CloudMasa Bot</h2></div>',
        unsafe_allow_html=True
    )
    st.markdown('<div class="chat-messages" id="chat-messages">', unsafe_allow_html=True)

    # Display messages
    for msg in st.session_state.messages:
        if msg["role"] == "user":
            st.markdown(f'<div class="message user-message"><strong>You:</strong><br>{msg["content"]}</div>', unsafe_allow_html=True)
        else:
            icons = " ".join([f'<span class="tool-icon">{t["icon"]}</span>' for t in msg.get("tools", [{"icon": "🤖"}])])
            st.markdown(f'<div class="message assistant-message">{icons} <strong>Assistant:</strong><br>{msg["content"]}</div>', unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)

    # Input container
    st.markdown('<div class="input-container">', unsafe_allow_html=True)
    with st.form("user_input_form", clear_on_submit=False):
        st.text_input("", placeholder="Ask me a question...", key="input_text", label_visibility="collapsed")
        st.form_submit_button("➤", on_click=submit_user_message)
    st.markdown('</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    main()