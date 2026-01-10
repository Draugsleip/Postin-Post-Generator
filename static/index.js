const base_address = 'http://localhost:5000';
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

    if(!inputUrl){
        showError('Please Enter a URL!')
        return;
    }
    try{
        const response = await fetch(`${base_address}/generate`, {
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
    const resultText = result.textContent.trim();
    if(!resultText){
        alert("No content!")
        return;
    }

    try{
        await navigator.clipboard.writeText(resultText);


        alert('Post content copied to your clipboard. You will be redirected to LinkedIn!');

        const linkedinURL = `https://www.linkedin.com/feed/?shareActive=true`;
        window.open(linkedinURL, "_blank");

    } catch(error) {
        console.error('Failed to copy content: ', error);
    }
}

async function generateRandom(){

    randomizeBtn.disabled = true;
    randomizeBtn.innerHTML = `Generating... <span class="spinner-border text-primary spinner-border-sm" role="status" aria-hidden="true"></span>`;

    // reset previous results
    result.textContent = "";

    try{
        const response = await fetch(`${base_address}/generate_random`, {
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
