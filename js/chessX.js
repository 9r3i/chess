/* chessX.js
 * ~ implementation from chessboard.js
 * authored by 9r3i
 * https://github.com/9r3i
 * started at january 5th 2019
 * require: jquery 3.1.0 and chessboard.js
 * note: board is global variable for chessboard.
 */

/* initialize */
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
  console.log(legal.legalMove);
  if(!legal||!legal.legalMove||legal.legalMove.indexOf(to)<0){
    return 'snapback';
  }
  /* check for promotion */
  if(legal.promotion&&legal.promotion.indexOf(to)>=0){
    pawnPromotion(col,to);
    return 'trash';
  }
  /* change turn */
  var turn=board.turn.match(/^w/)?'black':'white';
  board.turn=turn;
  /* check special move -- [castling] */
  if(legal.specialMove&&!isCheck(old)){
    board.move(legal.specialMove,false);
  }
  /* pawn special remove */
  if(legal.pawnSpecialRemove){
    var npr=personalRemove(legal.pawnSpecialRemove,board.position());
    board.position(npr);
  }
  /* check for checkmate and draw at 0.3 sec */
  setTimeout(function(){
    if(isCheck()&&isCheckmate()){
      return checkmateDialog();
    }
    if(!isCheck()&&isCheckmate()){
      return drawDialog();
    }
  },300);
  /* check for pawn two steps */
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
  /* show to console */
  console.log(board.turn,board.fen(),from,to,piece);
}

/* draw dialog */
function drawDialog(close){
  /* check element */
  var r=document.getElementById('draw-dialog');
  if(r){r.parentElement.removeChild(r);}
  if(close){return false;}
  /* create element */
  var dial=document.createElement('div');
  var bg=document.createElement('div');
  var con=document.createElement('div');
  var head=document.createElement('div');
  /* add class and id */
  dial.id='draw-dialog';
  dial.classList.add('draw-dialog');
  bg.classList.add('draw-bg');
  con.classList.add('draw-content');
  head.classList.add('draw-header');
  /* append element */
  con.appendChild(head);
  dial.appendChild(bg);
  dial.appendChild(con);
  document.body.appendChild(dial);
  /* return as true */
  return true;
}

/* checkmate dialog */
function checkmateDialog(close){
  /* check element */
  var r=document.getElementById('checkmate-dialog');
  if(r){r.parentElement.removeChild(r);}
  if(close){return false;}
  /* create element */
  var dial=document.createElement('div');
  var bg=document.createElement('div');
  var con=document.createElement('div');
  var head=document.createElement('div');
  /* add class and id */
  dial.id='checkmate-dialog';
  dial.classList.add('checkmate-dialog');
  bg.classList.add('checkmate-bg');
  con.classList.add('checkmate-content');
  head.classList.add('checkmate-header');
  /* append element */
  con.appendChild(head);
  dial.appendChild(bg);
  dial.appendChild(con);
  document.body.appendChild(dial);
  /* return as true */
  return true;
}

/* pawn promotion dialog */
function pawnPromotion(t,to){
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
    an.onclick=function(e){
      var r=document.getElementById('promotion-dialog');
      if(r){r.parentElement.removeChild(r);}
      var type=this.dataset.type;
      var loc=this.dataset.location;
      var turn=this.dataset.turn;
      var newPosition=board.position();
      newPosition[loc]=type;
      board.position(newPosition);
      board.turn=turn;
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
    /* king's special move */
    if(col=='w'&&f=='e1'){
      if(!pos.hasOwnProperty('f1')
        &&!pos.hasOwnProperty('g1')
        &&pos.hasOwnProperty('h1')
        &&pos.h1=='wR'){
          pp.push('g1');
          specialMove='h1-f1';
      }else if(!pos.hasOwnProperty('b1')
        &&!pos.hasOwnProperty('c1')
        &&!pos.hasOwnProperty('d1')
        &&pos.hasOwnProperty('a1')
        &&pos.a1=='wR'){
          pp.push('c1');
          specialMove='a1-d1';
      }
    }else if(col=='b'&&f=='e8'){
      if(!pos.hasOwnProperty('f8')
        &&!pos.hasOwnProperty('g8')
        &&pos.hasOwnProperty('h8')
        &&pos.h8=='bR'){
          pp.push('g8');
          specialMove='h8-f8';
      }else if(!pos.hasOwnProperty('b8')
        &&!pos.hasOwnProperty('c8')
        &&!pos.hasOwnProperty('d8')
        &&pos.hasOwnProperty('a8')
        &&pos.a8=='bR'){
          pp.push('c8');
          specialMove='a8-d8';
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
function chessXBoard(turn,fen,orien){
  /* check arguments */
  turn=typeof turn==='string'&&turn.match(/^white|black$/)?turn:'white';
  orien=typeof orien==='string'&&orien.match(/^white|black$/)?orien:'white';
  /* start board */
  window.board=Chessboard('#chessX-board',{
    draggable:true,
    sparePieces:false,
    showNotation:true,
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
        checkmateDialog();
        return false;
      }
      /* check for draw */
      if(!isCheck()&&isCheckmate()){
        drawDialog();
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
  board.pawnTwo=false;
  /* --- board reposition --- */
  var maxWidth=getMaxWidth();
  var cxboard=document.getElementById('chessX-board');
  cxboard.style.width=(maxWidth)+'px';
  if(window.innerWidth-20>maxWidth){
    var nm=window.innerWidth-20-maxWidth;
    cxboard.style.marginLeft=(nm/2)+'px';
  }else{
    cxboard.style.marginLeft='0px';
  }board.resize(true);
  window.onresize=function(e){
    var maxWidth=getMaxWidth();
    var cxboard=document.getElementById('chessX-board');
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


