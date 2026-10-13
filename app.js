const modelStatus=document.getElementById("modelStatus");
const modelStatusText=document.getElementById("modelStatusText");
const imageInput=document.getElementById("imageInput");
const previewImage=document.getElementById("previewImage");
const emptyState=document.getElementById("emptyState");
const uploadButton=document.getElementById("uploadButton");
const cameraButton=document.getElementById("cameraButton");
const cameraPanel=document.getElementById("cameraPanel");
const cameraVideo=document.getElementById("cameraVideo");
const cameraCanvas=document.getElementById("cameraCanvas");
const captureButton=document.getElementById("captureButton");
const closeCameraButton=document.getElementById("closeCameraButton");
const analyzeButton=document.getElementById("analyzeButton");
const resultCard=document.getElementById("resultCard");
const predictionText=document.getElementById("predictionText");
const confidenceText=document.getElementById("confidenceText");
const confidenceFill=document.getElementById("confidenceFill");
const speakButton=document.getElementById("speakButton");
const showMoreButton=document.getElementById("showMoreButton");
const alternatives=document.getElementById("alternatives");
const resetButton=document.getElementById("resetButton");
const dropZone=document.getElementById("dropZone");
let model=null,cameraStream=null,latestPredictions=[];

async function loadModel(){
  try{
    modelStatusText.textContent="Loading AI model…";
    modelStatus.classList.remove("ready","error");
    model=await mobilenet.load({version:1,alpha:0.25});
    modelStatusText.textContent="AI model ready";
    modelStatus.classList.add("ready");
  }catch(error){
    console.error(error);
    modelStatusText.textContent="Could not load AI model";
    modelStatus.classList.add("error");
  }
}

function setImageFromFile(file){
  if(!file||!file.type.startsWith("image/"))return;
  const reader=new FileReader();
  reader.onload=(event)=>{
    previewImage.src=event.target.result;
    previewImage.hidden=false;
    emptyState.hidden=true;
    analyzeButton.disabled=false;
    resultCard.hidden=true;
    alternatives.hidden=true;
  };
  reader.readAsDataURL(file);
}

uploadButton.addEventListener("click",()=>imageInput.click());
imageInput.addEventListener("change",event=>setImageFromFile(event.target.files[0]));
["dragenter","dragover"].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.add("dragover")}));
["dragleave","drop"].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.remove("dragover")}));
dropZone.addEventListener("drop",event=>setImageFromFile(event.dataTransfer.files[0]));

cameraButton.addEventListener("click",async()=>{
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    cameraVideo.srcObject=cameraStream;
    cameraPanel.hidden=false;
  }catch(error){
    alert("Camera access is unavailable. You can still upload a photo.");
    console.error(error);
  }
});

function stopCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}
  cameraVideo.srcObject=null;
  cameraPanel.hidden=true;
}
closeCameraButton.addEventListener("click",stopCamera);
captureButton.addEventListener("click",()=>{
  const width=cameraVideo.videoWidth||640,height=cameraVideo.videoHeight||480;
  cameraCanvas.width=width;cameraCanvas.height=height;
  cameraCanvas.getContext("2d").drawImage(cameraVideo,0,0,width,height);
  previewImage.src=cameraCanvas.toDataURL("image/jpeg",.92);
  previewImage.hidden=false;emptyState.hidden=true;analyzeButton.disabled=false;resultCard.hidden=true;alternatives.hidden=true;
  stopCamera();
});

analyzeButton.addEventListener("click",async()=>{
  if(!model||previewImage.hidden)return;
  analyzeButton.disabled=true;
  const oldText=analyzeButton.textContent;
  analyzeButton.textContent="Analyzing…";
  try{
    latestPredictions=await model.classify(previewImage,3);
    const best=latestPredictions[0],confidence=Math.round(best.probability*100);
    predictionText.textContent=best.className;
    confidenceText.textContent=`${confidence}%`;
    confidenceFill.style.width=`${confidence}%`;
    resultCard.hidden=false;
    alternatives.innerHTML="";
    latestPredictions.slice(1).forEach(item=>{
      const row=document.createElement("div");row.className="alt-item";
      const name=document.createElement("span");name.textContent=item.className;
      const score=document.createElement("strong");score.textContent=`${Math.round(item.probability*100)}%`;
      row.append(name,score);alternatives.appendChild(row);
    });
  }catch(error){console.error(error);alert("The image could not be analyzed. Try another photo.")}
  finally{analyzeButton.textContent=oldText;analyzeButton.disabled=false}
});

speakButton.addEventListener("click",()=>{
  if(!latestPredictions.length||!("speechSynthesis" in window))return;
  window.speechSynthesis.cancel();
  const best=latestPredictions[0],confidence=Math.round(best.probability*100);
  const utterance=new SpeechSynthesisUtterance(`I think this is ${best.className}, with ${confidence} percent confidence.`);
  utterance.lang="en-US";utterance.rate=.92;window.speechSynthesis.speak(utterance);
});
showMoreButton.addEventListener("click",()=>{const show=alternatives.hidden;alternatives.hidden=!show;showMoreButton.textContent=show?"Hide alternatives":"Show alternatives"});
function resetApp(){imageInput.value="";previewImage.src="";previewImage.hidden=true;emptyState.hidden=false;analyzeButton.disabled=true;resultCard.hidden=true;alternatives.hidden=true;alternatives.innerHTML="";latestPredictions=[];confidenceFill.style.width="0%";stopCamera()}
resetButton.addEventListener("click",resetApp);window.addEventListener("beforeunload",stopCamera);loadModel();