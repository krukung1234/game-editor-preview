/* Production remains disabled Spark-only; disabled until owner approves Rules and website deployment. */
(()=>{const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
window.EDITOR_MEMBERSHIP_CONFIG=Object.freeze({mode:local?'emulator':'disabled',productionReviewed:false,region:'asia-southeast1',
firebase:local?{apiKey:'demo-key',projectId:'demo-game-editor-membership',authDomain:'demo-game-editor-membership.firebaseapp.com'}:{
apiKey:'AIzaSyAOpMBt-bt1H0H9RUDHE95fW7ftTo7xzQE',authDomain:'krukung-game-editor-vip.firebaseapp.com',projectId:'krukung-game-editor-vip',messagingSenderId:'179002609777',appId:'1:179002609777:web:0fd49c6abc0967cd6bcbd0'},
verificationContinueUrl:new URL('index.html',new URL('../',document.currentScript.src)).href});})();
