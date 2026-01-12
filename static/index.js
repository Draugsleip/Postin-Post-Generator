//const base_address = 'https://nonanachronistic-barabara-rheostatic.ngrok-free.dev';
//const base_address = 'http://localhost:5000';
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

shareBtn.addEventListener('click', function(){
    const content = result.value.trim();
    if(!content){
        alert("No content!")
        return;
    }

    const url = encodeURIComponent(window.location.href);
    const contentEncoded = encodeURIComponent(content);
    const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&summary=${contentEncoded}`;

    window.open(shareUrl, '_blank');
});
    

/* async function shareContent(){
//    const resultText = result.textContent.trim();
    const resultText = result.value.trim();
    if(!resultText){
        alert("No content!")
        return;
    }

    try{
        const response = await fetch(`/share_post`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ content: resultText })
        });
        const data = await response.json();

        if(response.ok){
            alert(`PostIn successfull!`);
        } else {
            if(response.status === 401){
                alert('Authentication required. Redirecting to LinkedIn login...');
                window.location.href = '/login/linkedin';
            } else {
                alert(`Failed to share post: ${data.message}`);
//                console.log(${data.message});
            }
        }
    } catch(error) {
        console.error('Some error occurred during posting');
    }
} */

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

