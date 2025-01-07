/* chess.js */
var WS, // WS.send(<string class>,<string method>,<array arguments>) or WS.close();
CHESS_SESSION='chess-'+Math.ceil(Math.random()*Math.pow(1024,5)).toString(36),
CHESS_USERID=null,
CHESS_USERNAME=null,
CHESS_TOKEN=null,    // current running game token
CHESS_GAME=null,     // current running game data
CHESS_USERS=[],      // registered users
CHESS_CLOSED=false;

/* update chess */
function chess(data){
  console.log('chess',data);
  /* register */
  if(data.register&&data.register.session&&data.register.session==CHESS_SESSION){
    if(data.register.status!=='OK'){
      return alertDialog(data.register.status);
    }return loginForm();
  }
  /* login */
  if(data.login&&data.login.session&&data.login.session==CHESS_SESSION){
    if(data.login.status!=='OK'){
      return alertDialog(data.login.status);
    }
    setCookie('userid',data.login.user.id);
    setCookie('username',data.login.user.username);
    return chessOnOpen();
  }
  /* users */
  if(data.users&&data.users.session&&data.users.session==CHESS_SESSION){
    if(data.users.status!=='OK'){
      return alertDialog(data.users.status);
    }
    if(data.users.user.id!=CHESS_USERID){
      return alertDialog('Error: User ID is misled.');
    }
    CHESS_USERS=data.users.data;
    return chessRequest('games',[CHESS_USERID]);
  }
  /* games */
  if(data.games&&data.games.session&&data.games.session==CHESS_SESSION){
    if(data.games.status!=='OK'){
      return alertDialog(data.games.status);
    }
    if(data.games.user.id!=CHESS_USERID){
      return alertDialog('Error: User ID is misled.');
    }
    return parseGames(data.games.data);
  }
  /* update - game */
  if(data.update&&data.update.token==CHESS_TOKEN){
    if(data.update.error){
      alertDialog(data.update.error);
      /* re-load stored game */
      return loadGame(CHESS_GAME);
    }
    /* check turn */
    var col=data.update.black==CHESS_USERID?'black':'white';
    if(col==data.update.turn){
      alertDialog('Your turn.');
    }
    /* load game update */
    loadGame(data.update);
    /* check for checkmate and draw at 0.3 sec */
    setTimeout(function(){
      if(isCheck()&&isCheckmate()){
        if(!isClosed()){
          WS.send('chess','gameover',[CHESS_USERID,CHESS_TOKEN,'checkmate']);
        }return alertDialog('Checkmate!');
      }
      if(!isCheck()&&isCheckmate()){
        if(!isClosed()){
          WS.send('chess','gameover',[CHESS_USERID,CHESS_TOKEN,'draw']);
        }return alertDialog('Draw!');
      }
      if(isCheck()){
        return alertDialog('Check!');
      }
    },300);
    /* return as true */
    return true;
  }
  /* select - game */
  if(data.select&&data.select.token==CHESS_TOKEN){
    if(data.select.error){
      return alertDialog(data.select.error);
    }
    if(data.select.black!=CHESS_USERID&&data.select.white!=CHESS_USERID){
      return alertDialog('Error: This is not your game.');
    }
    /* load selected game */
    return loadGame(data.select);
  }
  /* game over */
  if(data.gameover&&data.gameover.token==CHESS_TOKEN){
    if(data.gameover.id!=CHESS_USERID){
      if(data.gameover.message){
        return alertDialog(data.gameover.message);
      }return false;
    }
    if(data.gameover.error){return false;}
    if(data.gameover.black!=CHESS_USERID&&data.gameover.white!=CHESS_USERID){
      return false;
    }
    /* request games */
    return chessRequest('games',[CHESS_USERID]);
  }
  /* new game */
  if(data.newGame&&data.newGame.session&&data.newGame.session==CHESS_SESSION){
    if(data.newGame.error){
      return alertDialog(data.newGame.error);
    }return chessRequest('games',[CHESS_USERID]);
  }
  
  
  /* check for service */
  if(WS.raw.readyState===WS.raw.CLOSED){
    return alertDialog('Service is closed.');
  }
}

/* select users for new game */
function selectPlayer(){
  /* get index element */
  var index=gebi('index');
  if(!index){return alertDialog('Error: Failed to get index element.');}
  index.innerHTML='';
  /* build users table */
  var table=new tableObject(['id','username','play as']);
  /* parsing */
  var users=Array.isArray(CHESS_USERS)?CHESS_USERS:[];
  for(var i=0;i<users.length;i++){
    if(users[i].id==CHESS_USERID){continue;}
    var div=ce('div');
    var black=ce('button');
    var white=ce('button');
    black.classList.add('button');
    black.innerHTML='<i class="fa fa-save"></i>Black';
    black.title='Play as Black';
    black.dataset.userid=users[i].id;
    black.onclick=function(e){
      var uid=this.dataset.userid;
      return chessRequest('newGame',[uid,CHESS_USERID]);
    };
    black.style.marginRight='10px';
    white.classList.add('button');
    white.innerHTML='<i class="fa fa-save"></i>White';
    white.title='Play as White';
    white.dataset.userid=users[i].id;
    white.onclick=function(e){
      var uid=this.dataset.userid;
      return chessRequest('newGame',[CHESS_USERID,uid]);
    };
    div.appendChild(black);
    div.appendChild(white);
    table.addRow([
      users[i].id,users[i].username,div
    ]);
  }
  /* appending table to index */
  index.appendChild(table.table);
  /* return as true */
  return true;
}

/* parse games */
function parseGames(games){
  /* get index element */
  var index=gebi('index');
  if(!index){return alertDialog('Error: Failed to get index element.');}
  index.innerHTML='';
  /* build game table */
  var table=new tableObject(['id','opponent','status','action']);
  /* id,white,black,fen,turn,token,pawnTwo,status */
  /* parsing */
  games=Array.isArray(games)?games:[];
  for(var i=0;i<games.length;i++){
    var ori=CHESS_USERID==games[i].black?'black':'white';
    var ocol=CHESS_USERID==games[i].black?'white':'black';
    var opid=games[i][ocol];
    var user=getUserById(opid);
    var opponent=user&&user.username?user.username:'[Unknown]';
    var play=ce('button');
    play.classList.add('button');
    play.classList.add('button-blue');
    play.innerHTML='<i class="fa fa-play"></i>Play';
    play.title='Play the game';
    play.dataset.token=games[i].token;
    play.onclick=function(e){
      CHESS_TOKEN=this.dataset.token;
      if(!isClosed()){
        WS.send('chess','select',[CHESS_TOKEN]);
      }
    };
    var daop=opponent+'\r\nas:'+ori+'\r\nturn:'+games[i].turn;
    table.addRow([
      games[i].id,daop,games[i].status,play
    ]);
  }
  /* appending table to index */
  index.appendChild(table.table);
  /* other buttons */
  var div=ce('div');
  var logout=ce('button');
  var newGame=ce('button');
  div.style.marginTop='20px';
  logout.classList.add('button');
  logout.classList.add('button-red');
  newGame.classList.add('button');
  newGame.classList.add('button-green');
  logout.innerHTML='<i class="fa fa-sign-out"></i>Logout';
  newGame.innerHTML='<i class="fa fa-plus"></i>New Game';
  newGame.style.marginRight='10px';
  logout.onclick=function(e){
    var con=confirm('Logout?');
    if(!con){return false;}
    CHESS_USERID=null;
    CHESS_USERNAME=null;
    CHESS_TOKEN=null;
    CHESS_GAME=null;
    CHESS_USERS=[];
    setCookie('userid','',-1);
    setCookie('username','',-1);
    return chessOnOpen();
  };
  newGame.onclick=function(e){
    return selectPlayer();
  };
  div.appendChild(newGame);
  div.appendChild(logout);
  index.appendChild(div);
  /* authorize disconnect button button */
  if(wsAuthorized()){
    var auth=ce('button');
    auth.classList.add('button');
    auth.innerHTML='<i class="fa fa-power-off"></i>Disconnect';
    auth.style.marginLeft='10px';
    auth.onclick=function(e){
      var con=confirm('Disconnect?');
      if(!con){return false;}
      WS.close();
      return wsInit();
    };
    div.appendChild(auth);
  }
  /* return as true */
  return true;
}

/* on socket open */
function chessOnOpen(){
  /* prevent right click */
  window.oncontextmenu=function(e){
    e.preventDefault&&e.preventDefault();
    e.stopPropagation&&e.stopPropagation();
    e.cancelBubble=true;
    e.returnValue=false;
    return false;
  };
  /* get cookies */
  var pid=getCookie('userid');
  if(pid){CHESS_USERID=pid;}
  var pun=getCookie('username');
  if(pun){CHESS_USERNAME=pun;}
  /* login form */
  if(!CHESS_USERID){
    return loginForm();
  }
  /* --- after logged in --- */
  
  /* request users */
  chessRequest('users',[CHESS_USERID]);
  /* set page as loading */
  var index=gebi('index');
  if(index){
    index.innerHTML='<i class="fa fa-spinner fa-pulse"></i> Loading...';
    return true;
  }return false;
}

/* get user by id */
function getUserById(id){
  var users=Array.isArray(CHESS_USERS)?CHESS_USERS:[];
  var res=false;
  for(var i=0;i<users.length;i++){
    if(users[i].id==id){res=users[i];break;}
  }return res;
}

/* load board */
function loadGame(data){
  /* prepare */
  var turn=data.turn,
      fen=data.fen,
      orien=data.black==CHESS_USERID?'black':'white',
      pawnTwo=false;
  /* test pawnTwo */
  try{pawnTwo=JSON.parse(data.pawnTwo);}catch(e){}
  /* store new game data */
  CHESS_GAME=data;
  /* run the board */
  return chessXBoard(turn,fen,orien,pawnTwo);
}

/* register form */
function registerForm(){
  var index=gebi('index');
  if(!index){return false;}
  index.innerHTML='';
  /* create element */
  var induk=ce('div');
  var header=ce('div');
  var row1=ce('div');
  var row2=ce('div');
  var row3=ce('div');
  var row4=ce('div');
  var iuser=ce('input');
  var ipass=ce('input');
  var isubmit=ce('input');
  var an=ce('a');
  /* add classes */
  induk.classList.add('form');
  header.classList.add('form-header');
  iuser.classList.add('input');
  ipass.classList.add('input');
  isubmit.classList.add('submit');
  /* elements */
  header.innerText='Register';
  iuser.placeholder='Username';
  ipass.placeholder='Password';
  iuser.type='text';
  ipass.type='password';
  isubmit.type='submit';
  isubmit.value='Submit';
  isubmit.onclick=function(e){
    return chessRequest('register',[iuser.value,ipass.value]);
  };
  an.innerText='Login';
  an.onclick=loginForm;
  an.href='javascript:void(0);';
  row4.style.marginTop='10px';
  row1.appendChild(iuser);
  row2.appendChild(ipass);
  row3.appendChild(isubmit);
  row4.appendChild(an);
  induk.appendChild(header);
  induk.appendChild(row1);
  induk.appendChild(row2);
  induk.appendChild(row3);
  induk.appendChild(row4);
  index.appendChild(induk);
  return true;
}

/* login form */
function loginForm(){
  var index=gebi('index');
  if(!index){return false;}
  index.innerHTML='';
  /* create element */
  var induk=ce('div');
  var header=ce('div');
  var row1=ce('div');
  var row2=ce('div');
  var row3=ce('div');
  var row4=ce('div');
  var iuser=ce('input');
  var ipass=ce('input');
  var isubmit=ce('input');
  var an=ce('a');
  /* add classes */
  induk.classList.add('form');
  header.classList.add('form-header');
  iuser.classList.add('input');
  ipass.classList.add('input');
  isubmit.classList.add('submit');
  /* elements */
  header.innerText='Login';
  iuser.placeholder='Username';
  ipass.placeholder='Password';
  iuser.type='text';
  ipass.type='password';
  isubmit.type='submit';
  isubmit.value='Submit';
  isubmit.onclick=function(e){
    return chessRequest('login',[iuser.value,ipass.value]);
  };
  an.innerText='Register';
  an.onclick=registerForm;
  an.href='javascript:void(0);';
  row4.style.marginTop='10px';
  row1.appendChild(iuser);
  row2.appendChild(ipass);
  row3.appendChild(isubmit);
  row4.appendChild(an);
  induk.appendChild(header);
  induk.appendChild(row1);
  induk.appendChild(row2);
  induk.appendChild(row3);
  induk.appendChild(row4);
  index.appendChild(induk);
  return true;
}

/* chess request - request for current session only */
function chessRequest(method,args){
  /* check for service */
  if(isClosed()){return false;}
  /* arguments */
  args=Array.isArray(args)?args:[]
  var newArgs=[CHESS_SESSION];
  for(var i=0;i<args.length;i++){
    newArgs.push(args[i]);
  }return WS.send('chess',method,newArgs);
}

/* check service */
function isClosed(){
  if(WS.raw.readyState===WS.raw.CLOSED){
    return alertDialog('Service is closed.');
  }return false;
}





/* chessX.js
 * ~ implementation from chessboard.js
 * authored by 9r3i
 * https://github.com/9r3i
 * started at january 5th 2019
 * require: jquery 3.1.0 and chessboard.js
 * note: board is global variable for chessboard.
 */

/* initialize - chess testing only */
function chessXInit(){
  /* prevent right click */
  window.oncontextmenu=function(e){
    e.preventDefault&&e.preventDefault();
    e.stopPropagation&&e.stopPropagation();
    e.cancelBubble=true;
    e.returnValue=false;
    return false;
  };
  /* prepare fen, orientation and turn */
  //var fen='3r2k1/4n1bp/2p5/4p3/4P3/5P1P/r5P1/5RK1';
  var fen='r1b1kbnr/ppp3pp/4p1q1/4n3/3pP3/3P4/PPP2PPP/RNBQ1RK1';
  //var fen='k7/p6P/7K/8/8/8/8/8'; // for pawn promotion testing only
  //var fen='8/8/8/8/1Q6/8/k1K5/8'; // for checkmate and draw testing only
  var turn='white';
  var orien='white';
  return chessXBoard(turn,fen,orien);
}

/* get all movement posibilities */
function getAllMovementPosibilities(pos){
  /* check pos object */
  pos=typeof pos==='object'&&pos!==null?pos:board.position();
  /* get turn */
  var ori=board.turn.substr(0,1);
  var sr={};
  /* parse one-by-one of pieces' position */
  for(var i in pos){
    if(pos[i].substr(0,1)!=ori){continue;}
    var legal=legalMove(pos[i].substr(1,1),i,pos);
    if(!legal||!legal.legalMove||legal.legalMove.length==0){
      continue;
    }sr[i]=[];
    var ll=legal.legalMove;
    for(var o=0;o<ll.length;o++){
      var np=personalMove(i,ll[o],board.position());
      sr[i].push(ll[o]);
    }
  }return sr;
}

/* dropped - piece move validation */
function dropped(from,to,piece,cur,old,ori){
  //console.log(from,to,piece,cur,old,ori);
  /* set global board variable */
  var board=board||window.board;
  /* trashed return */
  var trashed=false;
  /* check movement turn */
  if(board.turn.substr(0,1)!==piece.substr(0,1)||from==to||to=='offboard'||from=='spare'){
    return 'snapback';
  }
  /* check movement pieces */
  var pieces=['K','Q','B','N','R','P'];
  var col=piece.substr(0,1);
  var cp=piece.substr(1,1);
  /* check for check */
  if(isCheck(cur)){
    return 'snapback';
  }
  /* validate movement */
  var legal=legalMove(cp,from,old);
  //console.log(legal);
  if(!legal||!legal.legalMove||legal.legalMove.indexOf(to)<0){
    return 'snapback';
  }
  /* change turn */
  var turn=board.turn.match(/^w/)?'black':'white';
  board.turn=turn;
  /* check special move -- [castling] */
  if(legal.specialMove&&!isCheck(old)&&legal.specialMove.king==to){
    board.move(legal.specialMove.rock,false);
  }
  /* pawn special remove -- [en passant] */
  if(legal.pawnSpecialRemove){
    var npr=personalRemove(legal.pawnSpecialRemove,board.position());
    board.position(npr);
  }
  /* check for pawn two steps -- prepare for [en passant] option */
  if(cp=='P'&&((col=='b'&&from.substr(1,1)==7&&to.substr(1,1)==5)
    ||(col=='w'&&from.substr(1,1)==2&&to.substr(1,1)==4))){
    board.pawnTwo={
      col:col=='w'?'b':'w',
      cell:from.substr(0,1)+(col=='w'?3:6),
      remove:to
    };
  }else{
    board.pawnTwo=false;
  }
  /* check for checkmate and draw at 0.3 sec */
  setTimeout(function(){
    if(isCheck()&&isCheckmate()){
      if(!isClosed()){
        WS.send('chess','gameover',[CHESS_USERID,CHESS_TOKEN,'checkmate']);
      }return alertDialog('Checkmate!');
    }
    if(!isCheck()&&isCheckmate()){
      if(!isClosed()){
        WS.send('chess','gameover',[CHESS_USERID,CHESS_TOKEN,'draw']);
      }return alertDialog('Draw!');
    }
  },300);
  /* show to console */
  setTimeout(function(){
    console.log(board.turn,board.fen(),from,to,piece,board.pawnTwo);
  },10);
  /* check for promotion */
  if(legal.promotion&&legal.promotion.indexOf(to)>=0){
    trashed=true;
  }
  /* --- send the update - wait 0.01 sec for board to generate --- */
  setTimeout(function(){
    var args=[
      CHESS_USERID,
      CHESS_TOKEN,
      board.fen(),
      from,
      to,
      piece,
      board.pawnTwo?JSON.stringify(board.pawnTwo):''
    ];
    /* check for promotion */
    if(legal.promotion&&legal.promotion.indexOf(to)>=0){
      return pawnPromotion(col,to,args);
    }
    /* send update */
    if(!isClosed()){
      WS.send('chess','update',args);
    }
  },10);//*/
  /* return result */
  return trashed?'trash':true;
}

/* alert dialog */
function alertDialog(text){
  /* check element */
  var r=document.getElementById('alert-dialog');
  if(r){r.parentElement.removeChild(r);}
  if(typeof text!=='string'){return false;}
  /* create element */
  var dial=document.createElement('div');
  var bg=document.createElement('div');
  var con=document.createElement('div');
  var head=document.createElement('div');
  /* add class and id */
  dial.id='alert-dialog';
  dial.classList.add('alert-dialog');
  bg.classList.add('alert-bg');
  con.classList.add('alert-content');
  head.classList.add('alert-header');
  /* insert text */
  head.innerText=text;
  /* closing click on background */
  bg.onclick=function(e){
    var r=document.getElementById('alert-dialog');
    if(r){r.parentElement.removeChild(r);}
    return true;
  };
  /* append element */
  con.appendChild(head);
  dial.appendChild(bg);
  dial.appendChild(con);
  document.body.appendChild(dial);
  /* return as true */
  return true;
}

/* pawn promotion dialog */
function pawnPromotion(t,to,args){
  /* check turn */
  if(typeof t!=='string'||!t.match(/^(b|w)/)){return false;}
  /* check element */
  var r=document.getElementById('promotion-dialog');
  if(r){r.parentElement.removeChild(r);}
  /* create element */
  var dial=document.createElement('div');
  var bg=document.createElement('div');
  var d=document.createElement('div');
  /* add class and id */
  dial.id='promotion-dialog';
  dial.classList.add('promotion-dialog');
  bg.classList.add('promotion-bg');
  d.classList.add('promotion-content');
  /* append element */
  dial.appendChild(bg);
  dial.appendChild(d);
  document.body.appendChild(dial);
  /* resizing content dialog */
  var wh=window.innerHeight;
  var dh=wh>(200+20)?200:(wh-20);
  d.style.marginTop='-'+(dh/2)+'px';
  d.style.height=dh+'px';
  /* prepare promotion and color */
  var color=t.match(/^w/)?'white':'black';
  var col=t.match(/^w/)?'w':'b';
  var turn=t.match(/^w/)?'black':'white';
  var proms={
    'Queen':col+'Q',
    'Bishop':col+'B',
    'Knight':col+'N',
    'Rock':col+'R',
  };
  /* add html tags */
  var ph=document.createElement('div');
  ph.classList.add('promotion-header');
  ph.innerText='Promote to';
  d.appendChild(ph);
  for(var i in proms){
    var an=document.createElement('div');
    var pd=document.createElement('div');
    pd.classList.add('promotion-each');
    pd.classList.add('promotion-'+color+'-'+i.toLowerCase());
    pd.innerText=i;
    an.dataset.type=proms[i];
    an.dataset.location=to;
    an.dataset.turn=turn;
    an.dataset.args=JSON.stringify(args);
    an.onclick=function(e){
      var r=document.getElementById('promotion-dialog');
      if(r){r.parentElement.removeChild(r);}
      var type=this.dataset.type;
      var loc=this.dataset.location;
      var turn=this.dataset.turn;
      var args=JSON.parse(this.dataset.args);
      var newPosition=board.position();
      newPosition[loc]=type;
      board.position(newPosition);
      board.turn=turn;
      setTimeout(function(){
        args[2]=board.fen();
        if(!isClosed()){
          WS.send('chess','update',args);
        }
      },10);
      return true;
    };
    an.appendChild(pd);
    d.appendChild(an);
  }return true;
}

/* personal move piece */
function personalMove(from,to,pos){
  if(!pos||!from||!to||!pos[from]){return false;}
  var np={},pc=pos[from];
  for(var i in pos){
    if(i==from){continue;}
    np[i]=pos[i];
  }np[to]=pc;
  return np;
}

/* personal remove piece */
function personalRemove(from,pos){
  if(!pos||!from||!pos[from]){return false;}
  var np={};
  for(var i in pos){
    if(i==from){continue;}
    np[i]=pos[i];
  }return np;
}

/* is checkmate */
function isCheckmate(pos){
  /* check pos object */
  pos=typeof pos==='object'&&pos!==null?pos:board.position();
  /* get turn */
  var ori=board.turn.substr(0,1);
  var sr=[];
  /* parse one-by-one of pieces' position */
  for(var i in pos){
    if(pos[i].substr(0,1)!=ori){continue;}
    var legal=legalMove(pos[i].substr(1,1),i,pos);
    if(!legal||!legal.legalMove||legal.legalMove.length==0){
      continue;
    }var ll=legal.legalMove;
    for(var o=0;o<ll.length;o++){
      var np=personalMove(i,ll[o],board.position());
      if(!isCheck(np)){sr.push(pos[i]+','+i+','+ll[o]);}
    }
  }return sr.length?false:true;
}

/* is check */
function isCheck(pos){
  /* check pos object */
  pos=typeof pos==='object'&&pos!==null?pos:board.position();
  /* get turn */
  var ori=board.turn.substr(0,1);
  var kp=false,r=false;
  /* get king position */
  for(var i in pos){
    if(pos[i]==ori+'K'){kp=i;break;}
  }if(!kp){return false;}
  /* parse one-by-one of opponent pieces' position */
  for(var i in pos){
    if(i==kp||!pos[i]||pos[i].substr(0,1)==ori){continue;}
    var legal=legalMove(pos[i].substr(1,1),i,pos);
    if(!legal||!legal.legalMove||legal.legalMove.length==0){
      continue;
    }var ll=legal.legalMove;
    for(var o=0;o<ll.length;o++){
      if(kp==ll[o]){r=true;break;}
    }
  }
  /* return as bool */
  return r;
}

/* get legal movements
 * @parameters:
 *   p   = string of name of piece, e.g: K, Q, etc.
 *   f   = string of from position
 *   pos = object of fen object positions
 * @return: object of legal movements
 *          - legalMove: array of legal movements
 *          - specialMove: string of special move or bool false if none
 */
function legalMove(p,f,pos){
  var ps=['K','Q','B','N','R','P'];
  var rs=['a','b','c','d','e','f','g','h'];
  if(ps.indexOf(p)<0){return false;}
  var r=[],
      pn=pos[f],
      col=pn.substr(0,1),
      a=f.substr(0,1),
      b=parseInt(f.substr(1,1)),
      cls=cells(),
      aa=rs.indexOf(a),
      specialMove=false,
      pawnSpecialRemove=false,
      promotion=false,
      pp=[];
  /* --- KING --- */
  if(p=='K'){
    pp=[
      a+(b+1),
      a+(b-1),
      rs[aa+1]+b,
      rs[aa+1]+(b+1),
      rs[aa+1]+(b-1),
      rs[aa-1]+b,
      rs[aa-1]+(b+1),
      rs[aa-1]+(b-1)
    ];
    /* king's special move -- [castling] */
    if(col=='w'&&f=='e1'){
      if(!pos.hasOwnProperty('f1')
        &&!pos.hasOwnProperty('g1')
        &&pos.hasOwnProperty('h1')
        &&pos.h1=='wR'){
          pp.push('g1');
          specialMove={king:'g1',rock:'h1-f1'};
      }else if(!pos.hasOwnProperty('b1')
        &&!pos.hasOwnProperty('c1')
        &&!pos.hasOwnProperty('d1')
        &&pos.hasOwnProperty('a1')
        &&pos.a1=='wR'){
          pp.push('c1');
          specialMove={king:'c1',rock:'a1-d1'};
      }
    }else if(col=='b'&&f=='e8'){
      if(!pos.hasOwnProperty('f8')
        &&!pos.hasOwnProperty('g8')
        &&pos.hasOwnProperty('h8')
        &&pos.h8=='bR'){
          pp.push('g8');
          specialMove={king:'g8',rock:'h8-f8'};
      }else if(!pos.hasOwnProperty('b8')
        &&!pos.hasOwnProperty('c8')
        &&!pos.hasOwnProperty('d8')
        &&pos.hasOwnProperty('a8')
        &&pos.a8=='bR'){
          pp.push('c8');
          specialMove={king:'c8',rock:'a8-d8'};
      }
    }
  }
  /* --- QUEEN --- */
  if(p=='Q'){
    for(var o=0;o<8;o++){
      for(var i=1;i<8;i++){
        var test=[
          rs[aa+i]+(b+i),
          rs[aa+i]+(b-i),
          rs[aa-i]+(b+i),
          rs[aa-i]+(b-i),
          rs[aa]+(b+i),
          rs[aa]+(b-i),
          rs[aa+i]+(b),
          rs[aa-i]+(b)
        ];pp.push(test[o]);
        if(pos.hasOwnProperty(test[o])){
          break;
        }
      }
    }
  }
  /* --- BISHOP --- */
  if(p=='B'){
    for(var o=0;o<4;o++){
      for(var i=1;i<8;i++){
        var test=[
          rs[aa+i]+(b+i),
          rs[aa+i]+(b-i),
          rs[aa-i]+(b+i),
          rs[aa-i]+(b-i)
        ];pp.push(test[o]);
        if(pos.hasOwnProperty(test[o])){
          break;
        }
      }
    }
  }
  /* --- KNIGHT --- */
  if(p=='N'){
    pp=[
      rs[aa+1]+(b+2),
      rs[aa+1]+(b-2),
      rs[aa-1]+(b+2),
      rs[aa-1]+(b-2),
      rs[aa+2]+(b+1),
      rs[aa+2]+(b-1),
      rs[aa-2]+(b+1),
      rs[aa-2]+(b-1),
    ];
  }
  /* --- ROCK --- */
  if(p=='R'){
    for(var o=0;o<4;o++){
      for(var i=1;i<8;i++){
        var test=[
          rs[aa]+(b+i),
          rs[aa]+(b-i),
          rs[aa+i]+(b),
          rs[aa-i]+(b)
        ];pp.push(test[o]);
        if(pos.hasOwnProperty(test[o])){
          break;
        }
      }
    }
  }
  /* --- PAWN --- */
  if(p=='P'){
    /* forward one step */
    var test=a+(b+(col=='w'?1:-1));
    if(!pos.hasOwnProperty(test)){
      pp.push(test);
    }
    /* two steps - in beginning */
    if(col=='w'&&b==2){
      var test=a+(b+1);
      if(!pos.hasOwnProperty(test)){
        pp.push(a+(b+2));
      }
    }else if(col=='b'&&b==7){
      var test=a+(b-1);
      if(!pos.hasOwnProperty(test)){
        pp.push(a+(b-2));
      }
    }
    /* opponent */
    var op1=rs[aa+1]+(b+(col=='w'?1:-1));
    var op2=rs[aa-1]+(b+(col=='w'?1:-1));
    if(pos.hasOwnProperty(op1)&&pos[op1].substr(0,1)!=col){
      pp.push(op1);
    }
    if(pos.hasOwnProperty(op2)&&pos[op2].substr(0,1)!=col){
      pp.push(op2);
    }
    /* pawn to steps */
    if(board.pawnTwo&&board.pawnTwo.col==col){
      var pts=[
        rs[aa+1]+(b+1),
        rs[aa+1]+(b-1),
        rs[aa-1]+(b+1),
        rs[aa-1]+(b-1)
      ];
      if(pts.indexOf(board.pawnTwo.cell)>=0){
        pp.push(board.pawnTwo.cell);
        pawnSpecialRemove=board.pawnTwo.remove;
      }
    }
  }
  /* parse result */
  for(var i=0;i<pp.length;i++){
    if(cls.indexOf(pp[i])>=0){
      if(pos.hasOwnProperty(pp[i])&&pos[pp[i]].substr(0,1)==col){
        continue;
      }r.push(pp[i]);
    }
  }
  /* pawn promotion */
  if(p=='P'&&((col=='w'&&b==7)||(col=='b'&&b==2))){
    var sr=[];
    for(var i=0;i<r.length;i++){
      if((col=='w'&&r[i].match(/8$/))||(col=='b'&&r[i].match(/1$/))){
        sr.push(r[i]);
      }
    }
    if(sr.length>0){
      promotion=sr;
    }
  }
  /* return as object */
  return {
    legalMove:r,
    specialMove:specialMove,
    promotion:promotion,
    pawnSpecialRemove:pawnSpecialRemove,
  };
}

/* chess board */
function chessXBoard(turn,fen,orien,pawnTwo){
  /* check arguments */
  turn=typeof turn==='string'&&turn.match(/^white|black$/)?turn:'white';
  orien=typeof orien==='string'&&orien.match(/^white|black$/)?orien:'white';
  pawnTwo=typeof pawnTwo==='object'&&pawnTwo!==null?pawnTwo:false;
  var elementID='index';
  /* start board */
  window.board=Chessboard('#'+elementID,{
    draggable:true,
    sparePieces:false,
    showNotation:false,
    appearSpeed:'slow',
    moveSpeed:'slow',
    orientation:orien,
    dropOffBoard:'trash',
    onDrop:dropped,
    onDragStart:function(from,piece,old,ori){
      /* console.log(from,piece,old,ori); */
      if(window.board.turn.substr(0,1)!==piece.substr(0,1)){
        return false;
      }
      /* check for checkmate */
      if(isCheck()&&isCheckmate()){
        alertDialog('Checkmate!');
        return false;
      }
      /* check for draw */
      if(!isCheck()&&isCheckmate()){
        alertDialog('Draw!');
        return false;
      }
      /* check for game turn */
      var col=CHESS_GAME.black==CHESS_USERID?'black':'white';
      if(window.board.turn!=col){
        return false;
      }
    },
    pieceTheme:'.neo/{piece}.png',
    position:fen?fen:'start',
  });
  /* check board */
  if(!board){return false;}
  /* set turn and last pawn two steps */
  board.turn=turn;
  board.pawnTwo=pawnTwo;
  /* --- board reposition --- */
  var maxWidth=getMaxWidth();
  var cxboard=document.getElementById(elementID);
  cxboard.style.width=(maxWidth)+'px';
  if(window.innerWidth-20>maxWidth){
    var nm=window.innerWidth-20-maxWidth;
    cxboard.style.marginLeft=(nm/2)+'px';
  }else{
    cxboard.style.marginLeft='0px';
  }board.resize(true);
  window.onresize=function(e){
    var maxWidth=getMaxWidth();
    var cxboard=document.getElementById(elementID);
    cxboard.style.width=(maxWidth)+'px';
    if(window.innerWidth-20>maxWidth){
      var nm=window.innerWidth-20-maxWidth;
      cxboard.style.marginLeft=(nm/2)+'px';
    }else{
      cxboard.style.marginLeft='0px';
    }board.resize(true);
  };
  /* return as true */
  return board?true:false;
}

/* get maximum width of board defend of window inner width */
function getMaxWidth(){
  var wh=window.innerHeight;
  var ww=window.innerWidth;
  var nh=wh-20; // if sparePieces is true --> wh*0.75;
  var nw=ww-20;
  return Math.min(nh,nw);
}

/* get all cells name as array */
function cells(){
  var s=['a','b','c','d','e','f','g','h'];
  var n=[1,2,3,4,5,6,7,8];
  var r=[];
  for(var i=0;i<s.length;i++){
    for(var o=0;o<n.length;o++){
      r.push(s[i]+''+n[o]);
    }
  }return r;
}

/* build table */
function tableObject(ths){
  /* prepare elements */
  var table=ce('table');
  var thead=ce('thead');
  var tbody=ce('tbody');
  var thr=ce('tr');
  /* add class */
  table.classList.add('table');
  /* parse header */
  ths=Array.isArray(ths)?ths:[];
  for(var i=0;i<ths.length;i++){
    var th=ce('th');
    if(typeof ths[i]==='object'
      &&typeof ths[i].appendChild==='function'){
      th.appendChild(ths[i]);
    }else if(ths[i]=='id'){
      th.innerText='ID';
    }else{
      var name=ths[i].substr(0,1).toUpperCase()+ths[i].substr(1);
      var cname=D.createTextNode(name);
      th.appendChild(cname);
    }thr.appendChild(th);
  }
  /* append elements */
  thead.appendChild(thr);
  table.appendChild(thead);
  table.appendChild(tbody);
  /* return elements */
  return {
    table:table,
    thead:thead,
    tbody:tbody,
    addRow:function(rows){
      var tbody=this.tbody;
      var tr=ce('tr');
      rows=Array.isArray(rows)?rows:[];
      for(var i=0;i<rows.length;i++){
        var td=ce('td');
        if(i==0){td.style.textAlign='right';}
        if(typeof rows[i]==='object'
          &&typeof rows[i].appendChild==='function'){
          td.appendChild(rows[i]);
        }else{
          td.innerText=rows[i];
        }tr.appendChild(td);
      }tbody.appendChild(tr);
      return tr;
    },
  };
}


