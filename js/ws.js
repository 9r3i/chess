/* ws.js, ~ websocket client, authored by 9r3i, https://github.com/9r3i, started at september 12th 2018 */

/* connect to socket server
 , url   = string of socket server
 , token = string of websocket token
 , exts  = array of client extensions
 , err   = function of error callback */
function ws(url,token,exts,err){
  if(typeof url!=='string'
    ||typeof exts!=='object'
    ||typeof token!=='string'
    ||!token.match(/^[a-z0-9]+$/ig)){
    return false;
  }var raw=false;
  this.url=url;
  var opt=['mserver'];
  try{raw=new WebSocket(this.url,opt);}catch(e){return false;}
  if(!raw||typeof raw.close!=='function'){return false;}
  this.exts=exts;
  this.token=token;
  this.raw=raw;
  raw.onopen=function(e){
    console.log('opened');
    for(var i=0;i<exts.length;i++){
      var ext=exts[i]+'OnOpen';
      if(!window[ext]
        ||typeof window[ext]!=='function'){
        continue;
      }window[ext].apply(ext,[]);
    }return true;
  };
  raw.onclose=function(e){
    console.log('closed');
    for(var i=0;i<exts.length;i++){
      var ext=exts[i]+'OnClose';
      if(!window[ext]
        ||typeof window[ext]!=='function'){
        continue;
      }window[ext].apply(ext,[]);
    }return true;
  };
  raw.onerror=function(e){
    console.log('error');
    return typeof err==='function'
      ?err('Error: Failed to connect.'):false;
  };
  raw.onmessage=function(e){
    if(!e.data){
      console.log(e);
      return false;
    }
    var data=false;
    try{data=JSON.parse(e.data);}catch(e){}
    if(data.type==='system'&&data.status==='connected'
      &&data.extensions&&Array.isArray(data.extensions)){
      for(var i=0;i<data.extensions.length;i++){
        var ext=data.extensions[i];
        var isReadyExt=typeof W[ext]==='function'?true:false;
        console.log('Info: Extention "'+ext+'" is '
          +(isReadyExt?'ready':'not available')+'.');
      }return true;
    }else if(data.type==='extension'
      &&typeof data.result==='object'
      &&data.result!==null&&!data.error){
      for(var i=0;i<exts.length;i++){
        var ext=exts[i];
        if(!window[ext]
          ||typeof window[ext]!=='function'
          ||!data.result[ext]){
          continue;
        }window[ext].apply(ext,[data.result[ext]]);
      }return true;
    }else if(data.error){
      console.log('error',data.error);
      return false;
    }console.log('data',e.data);
  };
  this.__proto__.close=function(){
    if(this.raw.readyState===1){
      this.raw.send('close:'+this.token);
      return true;
    }return false;
  };
  this.__proto__.send=function(ext,method,args){
    if(this.raw.readyState===1){
      var data={ext:ext,method:method,args:args,token:this.token};
      try{this.raw.send(JSON.stringify(data));}catch(e){return false;}
      return true;
    }return false;
  };
}


