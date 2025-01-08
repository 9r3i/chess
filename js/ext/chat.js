/* chat.js */
var WS,
CHAT_AUDIO=new Audio('files/receive.mp3'),
CHAT_USER=null,
CHAT_CLOSED=false;

/* update chat */
function chat(data){
  var el=gebi('chat-content');
  if(!el){return chatInit();}
  //console.log('chat',data);
  var r=false;
  if(data.select){r=data.select.data;}
  else if(data.insert){r=data.insert.data;}
  else if(data.clear){r=data.clear.data;}
  if(!r){return false;}
  return chatContent(r);
}
/* restart chat after closed */
function chatRestart(){
  if(CHAT_CLOSED){
    wsConnector();
  }
  var index=gebi('index');
  if(index){
    index.innerHTML='<div style="font-family:consolas;monospace;font-size:13px;">Connecting...</div>';
  }
  CHAT_CLOSED=false;
  return wsInit();
}
/* clear data */
function chatSelect(){
  WS.send('chat','select',[]);
}
/* parse chat content
   r = object of data chats
   sound = bool of audio play
 */
function chatContent(r){
  var el=gebi('chat-content');
  if(!el){return false;}
  var count=0,other=0;
  var isEmpty=el.innerText==''?true:false;
  for(var i=0;i<r.length;i++){
    if(qs('div[data-id="'+r[i].id+'"]')){continue;}
    var iam=CHAT_USER==r[i].user?'#7b3':'#37b';
    other+=CHAT_USER!==r[i].user?1:0;
    var each=ce('div');
    each.style.margin='5px 0px';
    each.dataset.id=r[i].id;
    each.innerHTML='<span style="color:'+iam+';">'+r[i].user+'</span>: '+r[i].text;
    el.appendChild(each);
    count++;
  }if(count&&other&&!isEmpty){CHAT_AUDIO.play();}
  return true;
}
/* close chat */
function chatClose(){
  WS.close();
  var html=''
    +'<div id="chat-input" style="padding:5px;margin:5px 0px;">'
    +'<input type="submit" id="chat-restart" value="Restart" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:0px;'
      +'background-color:#fff;" />'
    +'</div>';
  var index=gebi('index');
  if(index){index.innerHTML=html;}
  CHAT_CLOSED=true;
  var restart=gebi('chat-restart');
  restart.onclick=chatRestart;
}
/* clear data */
function chatClear(){
  WS.send('chat','clear',[]);
  var el=gebi('chat-content');
  if(el){el.innerHTML='';}
}
/* insert data
   text = string of chat message
 */
function chatInsert(text){
  if(!CHAT_USER||!text||text.trim()==''){return false;}
  WS.send('chat','insert',[CHAT_USER,text.trim()]);
}
/* initialize */
function chatInit(){
  CHAT_USER=getCookie('chat-user');
  if(!CHAT_USER){
    CHAT_USER='[GUEST]';
    setCookie('chat-user',CHAT_USER);
  }
  var index=gebi('index');
  if(!index){return false;}
  var html=''
    +'<div id="chat-content" '
      +'style="border:1px solid #ccc;padding:10px;margin:10px 5px;'
      +'font-family:consolas;monospace;font-size:13px;">'
    +'</div>'
    +'<div id="chat-input" style="padding:5px;margin:5px 0px;">'
    +'<input type="text" id="chat-text" '
      +'style="width:calc(66% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;" />'
    +'<input type="submit" id="chat-send" value="Send" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:0px 0px 0px 10px;'
      +'background-color:#fff;" />'
    +'</div>'
    +'<div id="chat-input" style="padding:5px;margin:5px 0px;">'
    +'<input type="submit" id="chat-close" value="Close" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:0px;'
      +'background-color:#fff;" />'
    +'<input type="submit" id="chat-clear" value="Clear" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:0px 0px 0px 10px;'
      +'background-color:#fff;" />'
    +'<input type="submit" id="chat-user" value="User" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:0px 0px 0px 10px;'
      +'background-color:#fff;" />'
    +'<input type="submit" id="chat-reload" value="Reload" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:5px 0px 0px;'
      +'background-color:#fff;" />'
    +'<input type="submit" id="chat-restart" value="Restart" '
      +'style="width:calc(33% - 12px);padding:5px;border:1px solid #ccc;'
      +'font-family:consolas;monospace;font-size:13px;margin:5px 0px 0px 10px;'
      +'background-color:#fff;" />'
    +'</div>';
  index.innerHTML=html;
  chatSelect();
  var text=gebi('chat-text');
  text.focus();
  text.onkeyup=function(e){
    if(e.keyCode!==13){return false;}
    var val=this.value;
    this.value='';
    return chatInsert(val);
  };
  var clear=gebi('chat-clear');
  clear.onclick=chatClear;
  var close=gebi('chat-close');
  close.onclick=chatClose;
  var send=gebi('chat-send');
  send.onclick=function(e){
    var val=text.value;
    text.value='';
    return chatInsert(val);
  };
  var user=gebi('chat-user');
  user.onclick=function(e){
    var name=prompt('Insert username:',CHAT_USER);
    if(!name){return false;}
    CHAT_USER=name;
    setCookie('chat-user',name);
    return chatInit();
  };
  var reload=gebi('chat-reload');
  reload.onclick=function(){
    window.location.reload();
  };
  var restart=gebi('chat-restart');
  restart.onclick=chatRestart;
}
/* WS onclose */
function chatOnClose(){
  return chatClose();
}
/* WS onopen */
function chatOnOpen(){
  return chatInit();
}


