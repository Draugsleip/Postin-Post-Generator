const NGROK_URL = "{{ NGROK_URL }}";
const address = 'http://localhost:5000/generate';
const clearBtn = document.getElementById("clearBtn");
const inputBar = document.getElementById("InputUrl");
const generatorBtn = document.getElementById("gnrBtn");
const resultBox = document.getElementById("resultBox");
const shareBtn = document.getElementById("shareBtn");
const result = document.getElementById("result");

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
        const response = await fetch(`${address}`, {
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

function shareContent(){
    const resultText = result.textContent.trim();
    if(!resultText){
        alert("No content!")
        return;
    }

    const shareUrl = `https://${window.NGROK_URL}/share?text=${encodeURIComponent(resultText)}`;
//    const shareUrl = `https://nonanachronistic-barabara-rheostatic.ngrok-free.dev/share?text=${encodeURIComponent(resultText)}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, "_blank", "width=600,height=400");
}
