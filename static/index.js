const clearBtn = document.getElementById("clearBtn");
const inputBar = document.getElementById("InputUrl");
const generatorBtn = document.getElementById("gnrBtn");
const resultBox = document.getElementById("resultBox");
const shareBtn = document.getElementById("shareBtn");
const result = document.getElementById("result");
const randomizeBtn = document.getElementById("randomizeBtn");

async function processUrl(){
    const inputUrl = document.getElementById("InputUrl").value.trim();

    generatorBtn.disabled = true;
    generatorBtn.innerHTML = `Generating... <span class="spinner-border text-primary spinner-border-sm" role="status" aria-hidden="true"></span>`;

    // reset previous results
    result.textContent = "";
    resultBox.style.display = "none";

    if(!inputUrl){
        showError('Please Enter a URL!')
        return;
    }
    
    try{
        const response = await fetch(`/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url: inputUrl })
        });

        if(response.ok === false){
            throw new Error('Smt is wrong with response!')
        }

        const data = await response.json();
        result.textContent = data.summary.replace(/<br>/g, '\n');
    } catch(error){
        console.error("Error:", error);
        result.textContent= "Something went wrong!";
    } finally {
        generatorBtn.disabled = false;
        generatorBtn.innerHTML = "Generate Post";
        resultBox.style.display = "block";
    }
}

clearBtn.addEventListener('click', () => {
    inputBar.value = '';
    inputBar.focus();
});

function listenContent(){
    const resultTextOnly = document.getElementById("result").value.trim();

    window.speechSynthesis.cancel();

    const split_text = resultTextOnly.split("[TR]");
    const eng_part = split_text[0];
    const tr_part = split_text[1];

    if(eng_part){
        const text_to_voice_eng = new SpeechSynthesisUtterance(eng_part);
        text_to_voice_eng.lang = "en-US";
        window.speechSynthesis.speak(text_to_voice_eng)
        
        text_to_voice_eng.onend = function(){
            if(tr_part){
                const text_to_voice_tr = new SpeechSynthesisUtterance(tr_part);
                text_to_voice_tr.lang = "tr-TR";
                window.speechSynthesis.speak(text_to_voice_tr)
            }
        };
    }
}

async function shareContent(){
//    const resultText = result.textContent.trim();
    const resultText = result.value.trim();
    if(!resultText){
        alert("No content!")
        return;
    }

    shareBtn.disabled = true;
    shareBtn.innerHTML = `Posting... <span class="spinner-border text-light spinner-border-sm" role="status" aria-hidden="true"></span>`;

    try{
        const response = await fetch(`/share_post`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ content: resultText })
        });
        const data = await response.json();

        if(response.ok){
            alert(`PostIn successfull!`);
            result.value = '';
            resultBox.style.display = 'none';
        } else {
            if(response.status === 401){
                sessionStorage.setItem('pending_post', resultText);
                window.location.href = '/login/linkedin';
                return;
            }
            const errMsg = data.message || 'Failed to share post.';
            alert(errMsg);
            }
        }catch(error) {
        console.error('Some error occurred during posting');
        alert('Failed to share post. Please try again.');
    } finally {
        shareBtn.disabled = false;
        shareBtn.innerHTML = `Post<i class="bi bi-linkedin"></i>`;
    }
}

async function generateRandom(){

    randomizeBtn.disabled = true;
    randomizeBtn.innerHTML = `Generating... <span class="spinner-border text-primary spinner-border-sm" role="status" aria-hidden="true"></span>`;

    // reset previous results
    result.textContent = "";
    resultBox.style.display = "none";

    try{
        const response = await fetch(`/generate_random`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        });

        if(response.ok === false){
            throw new Error('Something is wrong with response!')
        }

        const data = await response.json();
        result.textContent = data.summary.replace(/<br>/g, '\n');
    } catch(error){
        console.error("Error:", error);
        result.textContent= "Something went wrong!";
    } finally {
        randomizeBtn.disabled = false;
        randomizeBtn.innerHTML = "Trending Now";
        resultBox.style.display = "block";
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const pendingPost = urlParams.get('pending_post') || sessionStorage.getItem('pending_post');

    if (pendingPost) {
        result.value = decodeURIComponent(pendingPost);
        resultBox.style.display = "block";

        sessionStorage.removeItem('pending_post');

        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
    }
});