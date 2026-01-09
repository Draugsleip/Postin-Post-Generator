from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import os
import requests
import trafilatura
from langchain.agents import create_agent

load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR,static_folder=STATIC_DIR)

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/generate", methods=["POST"])
def process_url():
    raw_data = request.json
    url = raw_data.get("url")

    try:
        resp = requests.get(url)
        if resp.status_code != 200:
            return jsonify({
                "status": "error",
                "details": "Cant fetch URL"
            })

        print(f"Response status code: {resp.status_code}")

        content = trafilatura.extract(resp.text)

        # langchain agent creation
        agent = create_agent(model="gpt-4.1-mini")

        # langchain style interaction
        # noinspection PyTypeChecker
        agent_response = agent.invoke(
            {"messages": [{"role": "user",
                         "content": f"""
                            You are a LinkedIn influencer and an expert at turning long content into short, high engagement posts. Read the text below and produce **two** outputs in this exact order: **EN** then **TR**.
                            **Instructions**
                            1. **EN**: Write a LinkedIn post that summarizes the content. Start with a one-line **headline** (punchy). Use 3–6 short paragraphs. Add **3 relevant hashtags** on a separate line at the end. Include one short **punchline** sentence near the end that is memorable and shareable.
                            2. **TR**: Immediately after the English post, provide a Turkish version of the first task. Mirror the English version's structure.
                            3. **Tone**: professional, optimistic, slightly bold, and actionable. Avoid jargon and long sentences. Use emojis.
                            4. **Length**: each language version must fit a single LinkedIn post (80–200 words).
                            5. **Formatting**: label sections with `[EN]` and `[TR]` on their own lines. Put hashtags on their own line.
                            6. **If the source text is longer than you can process**, summarize the most important 3 insights and proceed.
                            **Source text**
                            {content}
                        """}]}
        )
        # langchain style converting
        post_text = agent_response["messages"][1].content

        return jsonify({
            "summary": post_text,
            "status": "success"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "details": str(e)
        })
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
