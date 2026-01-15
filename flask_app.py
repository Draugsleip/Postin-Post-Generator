import json, os, requests, datetime, random
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from dotenv import load_dotenv
import trafilatura
from langchain.agents import create_agent
from requests_oauthlib import OAuth2Session
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()

# config
client_id=os.getenv("LINKEDIN_CLIENT_ID")
client_secret=os.getenv("LINKEDIN_CLIENT_SECRET")

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1' # THAT LINE IS A MUST TO AVOID MISMATCH ERRORS
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1' # THAT LINE IS A MUST TO AVOID MISMATCH ERRORS

scope = ['openid', 'profile', 'email', 'w_member_social'] # openid SHOULD BE USED with profile and email or you will get an auth error!!!
authorization_base_url = 'https://www.linkedin.com/oauth/v2/authorization'
token_url = 'https://www.linkedin.com/oauth/v2/accessToken'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

def post_to_linkedin(session_obj, author_urn, commentary):
    post_url = "https://api.linkedin.com/rest/posts"

    post_payload = {
        "author": author_urn,
        "commentary": commentary,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    post_headers = {
        'LinkedIn-Version': '202511', # make sure linkedin version is up to date or else you will get an error
        'X-Restli-Protocol-Version': '2.0.0'
    }
    return session_obj.post(
        post_url,
        headers=post_headers,
        data=json.dumps(post_payload)
    )

@app.route("/")
def index():
    pending_post = request.args.get('pending_post') or session.pop('pending_post', None)
    return render_template('index.html', pending_post=pending_post)

@app.route('/login/linkedin')
def login_linkedin():
    # "pending" approach to prevent losing post content in case of an auth redirect
    post_content = request.args.get('pending_post')
    if not post_content:
        post_content = session.get('pending_post')

    if post_content:
        session['pending_post'] = post_content

    linkedin_login = OAuth2Session(client_id, redirect_uri=url_for('authorize_linkedin', _external=True), scope=scope)
    authorization_url, state = linkedin_login.authorization_url(authorization_base_url)
    session['oauth_state'] = state
    return redirect(authorization_url)

@app.route('/authorize_linkedin')
def authorize_linkedin():
    try:
        linkedin_login = OAuth2Session(
            client_id,
            state=session.get('oauth_state'),
            redirect_uri=url_for('authorize_linkedin', _external=True)
        )

        token = linkedin_login.fetch_token(
            token_url,
            client_secret=client_secret,
            include_client_id=True,
            authorization_response=request.url
        )

        session['linkedin_token'] = token
        if 'pending_post' in session:
            pending_post = session['pending_post']
            session.pop('pending_post', None)
            return redirect(url_for('index', pending_post=pending_post))
        return redirect(url_for('index'))

    except Exception as e:
        print(f"Auth Error: {str(e)}")
        session.clear()
        return f"Authentication failed: {str(e)}", 400

@app.route('/share_post', methods=['POST'])
def share_post():
    if 'linkedin_token' not in session:
        data =request.get_json()
        post_content = data.get('content')

        if post_content:
            session['pending_post'] = post_content
        return jsonify({
            'status': 'error',
            'message': 'User not authenticated',
            'requires_auth': True
        }), 401
    token = session['linkedin_token']
    data = request.get_json()
    post_content = data.get('content')
    linkedin_client = OAuth2Session(client_id, token=token)

    try:
        user_info = linkedin_client.get('https://api.linkedin.com/v2/userinfo')
        if user_info.status_code == 401:
            session.pop('linkedin_token', None)
            if post_content:
                session['pending_post'] = post_content
            return jsonify({'status': 'error', 'message': 'Token expired. Please log in again.'}), 401
        user_info_jsoned = user_info.json()

        # 'sub' is basically id for LinkedIn users
        person_urn = f"urn:li:person:{user_info_jsoned.get('sub')}"

        response = post_to_linkedin(linkedin_client, person_urn, post_content)

        if response.status_code == 201:
            return jsonify({'status': 'success', 'message': 'Post shared successfully!'})
        else:
            return jsonify({'status': 'error', 'message': 'Something went wrong! -> share_post()'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

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

        # extract main content from the pasted url
        content = trafilatura.extract(resp.text)

        # langchain agent creation
        agent = create_agent(model="gpt-4.1-mini")
        # recent models are not compatible with web deployed usage yet

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

@app.route("/generate_random", methods=["POST"])
def generate_random():
    try:
        topic = get_trending_topics()

        agent = create_agent(model="gpt-4.1-mini")

        # noinspection PyTypeChecker
        agent_response = agent.invoke(
            {"messages": [{"role": "user",
                        "content": f"""
                                    You are a LinkedIn influencer and an expert at creating high engagement posts. Do NOT write about LinkedIn itself, LinkedIn content strategies, LinkedIn marketing alos do not write promotional content about specific brands, products, or books. Focus only on the topic provided. Create a LinkedIn post about `{topic}` with **two** outputs in this exact order: **EN** then **TR**.
                                    **Instructions**
                                    1. **EN**: Write a LinkedIn post. Start with a one-line **headline** (punchy). Use 3–6 short paragraphs. Add **3 relevant hashtags** on a separate line at the end. Include one short **punchline** sentence near the end that is memorable and shareable.
                                    2. **TR**: Immediately after the English post, provide a Turkish version of the first task. Mirror the English version's structure.
                                    3. **Tone**: professional, optimistic, slightly bold, and actionable. Avoid jargon and long sentences. Use emojis.
                                    4. **Length**: each language version must fit a single LinkedIn post (80–200 words).
                                    5. **Formatting**: label sections with `[EN]` and `[TR]` on their own lines. Put hashtags on their own line.
                                """}]}
        )
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

def get_trending_topics():
    google_search_url = "https://www.googleapis.com/customsearch/v1"
    search_parameters = {
        "key": GOOGLE_API_KEY,
        "cx": GOOGLE_SEARCH_ENGINE_ID,
        "q": f"top trending topics LinkedIn {datetime.datetime.now().year} site:news",
        "dateRestrict": "m3",
        "num": 10
    }
    response = requests.get(google_search_url, params=search_parameters)
    data = response.json()

    topics = []

    for item in data.get("items"):
        link = item.get("link")
        if not link:
            continue
        try:
            page_response = requests.get(link, timeout=5)
            if page_response.status_code != 200:
                continue
            page_context = trafilatura.extract(page_response.text)
            if page_context:
                topics.append(page_context)
        except Exception as e:
            continue

    return random.choice(topics)

@app.route('/logout')
def logout():
    session.clear()
    return "Logged out!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
