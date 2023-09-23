// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/jLeJTw1rQ/";
let model, webcam, ctx, labelContainer, maxPredictions;

let isPredicting = false;

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    const loadingPage = document.getElementById("loading");
    const homeMain = document.getElementById("home-main");
    const startBtn = document.getElementById("start");
    const Title = document.getElementById("title");
    loadingPage.innerHTML = "<center>Loading Necessary classes...</center>";
    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    isPredicting = true;
    // const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");

    startBtn.style.display = "none";
    stopBtn.style.display = "inline-block";

    // Convenience function to setup a webcam
    const size = 300;
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
    loadingPage.innerHTML = "<center>Allow Camera Permission</center>";
    await webcam.setup(); // request access to the webcam
    startBtn.style.display = "none";
    Title.style.marginTop = "10vh";
    await webcam.play();
    loadingPage.innerHTML = "";
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById("canvas");
    canvas.width = size;
    canvas.height = size;
    ctx = canvas.getContext("2d");
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) {
        // and class labels
        const div = document.createElement("div");
        div.id = `class${i}`;
        labelContainer.appendChild(div);
    }
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}
async function predict() {
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    const suspiciousClasses = [];

    for (let i = 0; i < maxPredictions; i++) {  // Include all classes
        const classPrediction =
            prediction[i].className +
            ": " +
            prediction[i].probability.toFixed(2);
        const classDiv = document.getElementById(`class${i}`);
        classDiv.innerHTML = classPrediction;

        if (i >= 3 && prediction[i].probability.toFixed(2) >= 0.98) {  // Only consider classes 3 to 7 for suspicious activity
            suspiciousClasses.push({class: prediction[i].className, probability: prediction[i].probability});
        }
    }

    suspiciousClasses.sort((a, b) => b.probability - a.probability);

    const output = document.getElementById("output");
    if (suspiciousClasses.length > 0) {
        output.style.color = "red";
        output.innerHTML = `Suspicious Activity Detected!<br>Most Likely Classes:<br>${suspiciousClasses.map(c => `${c.class} (${(c.probability * 100).toFixed(2)}%)`).join("<br>")}`;
        var audio = new Audio(
            "https://media.geeksforgeeks.org/wp-content/uploads/20190531135120/beep.mp3"
        );
        audio.play();
    } else {
        output.style.color = "white";
        output.innerHTML = "Normal activity";
    }

    // finally draw the poses
    drawPose(pose);
}



function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        // draw the keypoints and skeleton
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}

//this allows the user to start and stop in the same page 
// async function stopPredictions() {
//     isPredicting = false;  // Set isPredicting to false when stopping
//     const startBtn = document.getElementById("start");
//     const stopBtn = document.getElementById("stop");

//     startBtn.style.display = "inline-block";
//     stopBtn.style.display = "none";
// }

// async function loop(timestamp) {
//     if (isPredicting) {
//         webcam.update(); // update the webcam frame
//         await predict();
//     }
//     window.requestAnimationFrame(loop);
// }


//this allows refreshes the pages after clicking on stop button
async function stopPredictions() {
    location.reload();  // Refresh the page
}

async function loop(timestamp) {
    if (isPredicting) {
        webcam.update(); // update the webcam frame
        await predict();
    }
    window.requestAnimationFrame(loop);
}