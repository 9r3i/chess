<?php
/* chess class
 * ~ extension for ws (websocket)
 * authored by 9r3i
 * https://github.com/9r3i
 * started at january 7th 2019
 */
class chess{
  private $root=null;
  /* testing script */
  public function test($test=null){
    $output=[
      'argument'=>func_get_args(),
    ];
    //$db=$this->root();
    //$up=$db->query('alter table games add_column status=string()');
    //$output['alter']=$up;
    return $output;
  }
  /* clear all */
  public function clear(){
    $db=$this->root();
    $del=$db->query('delete from users where id>0');
    $del=$db->query('delete from games where id>0');
    $del=$db->query('delete from history where id>0');
    return 'Cleared.';
  }
  /* new game */
  public function newGame($session=null,$white=null,$black=null){
    if(!preg_match('/^[0-9]+$/',$white)||!preg_match('/^[0-9]+$/',$black)){
      return [
        'session'=>$session,
        'error'=>'Error: Invalid user ID.',
      ];
    }
    $db=$this->root();
    $selW=$sel=$db->query('select * from users where id='.$white);
    $selB=$sel=$db->query('select * from users where id='.$black);
    if(!isset($selW[0],$selB[0])){
      return [
        'session'=>$session,
        'error'=>'Error: User is not available.',
      ];
    }
    $token=md5(uniqid().mt_rand().microtime(true));
    $insert=$db->query('insert into games '.http_build_query([
      'white'=>'int:'.$white,
      'black'=>'int:'.$black,
      'token'=>'string:'.$token,
      'fen'=>'string(rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR)',
      'turn'=>'string(white)',
      'status'=>'string(open)',
    ]));
    if(!$insert||$db->error){
      return [
        'session'=>$session,
        'error'=>'Error: Failed to create new game.',
        'db-error'=>$db->error,
      ];
    }
    return [
      'session'=>$session,
      'token'=>$token,
    ];
  }
  /* game over */
  public function gameover($id=null,$token=null,$status=null){
    $errors=[];
    if(!preg_match('/^\d+$/',(string)$id)){
      $errors[]='Invalid user ID.';
    }
    if(!preg_match('/^[a-f0-9]{32}$/',(string)$token)){
      $errors[]='Invalid game token.';
    }
    if(!preg_match('/^draw|checkmate$/',(string)$status)){
      $errors[]='Invalid game status.';
    }
    /* check errors */
    if(!empty($errors)){
      return [
        'id'=>$id,
        'token'=>$token,
        'error'=>'Error: '.$errors[0],
        'errors'=>$errors,
        'input'=>func_get_args(),
      ];
    }
    $db=$this->root();
    $sel=$sel=$db->query('select * from games where token="'.$token.'"');
    if(!isset($sel[0])){
      return [
        'id'=>$id,
        'token'=>$token,
        'error'=>'Error: Game is not available.',
      ];
    }
    $data=(object)$sel[0];
    if($data->white!=$id&&$data->black!=$id){
      return [
        'id'=>$id,
        'token'=>$token,
        'error'=>'Error: You have no access to this game.',
        'data'=>$data,
      ];
    }
    $update=$db->query('update games '.http_build_query([
      'status'=>'string:'.$status,
    ]).' where token="'.$token.'"');
    return [
      'id'=>$id,
      'token'=>$token,
      'message'=>ucfirst($status).'!'
    ];
  }
  /* select games */
  public function games($session=null,$id=null){
    $output=['session'=>$session,'status'=>'OK'];
    if(!preg_match('/^\d+$/',$id)){
      $output['status']='Error: Invalid user ID.';
      return $output;
    }$db=$this->root();
    $sel=$db->query('select id,username,point from users where id='.$id);
    if(!isset($sel[0])){
      $output['status']='Error: User ID is not available.';
      return $output;
    }
    $games=$db->query('select * from games where white='.$id.' or black='.$id);
    $output['user']=$sel[0];
    $output['data']=is_array($games)?$games:[];
    return $output;
  }
  /* update per move */
  public function update($id=null,$token=null,$fen=null,$from=null,$to=null,$piece=null,$pawnTwo=null){
    $errors=[];
    if(!preg_match('/^\d+$/',(string)$id)){
      $errors[]='Invalid user ID.';
    }
    if(!preg_match('/^[a-f0-9]{32}$/',(string)$token)){
      $errors[]='Invalid game token.';
    }
    if(!is_string($fen)){
      $errors[]='Invalid string FEN.';
    }
    if(!preg_match('/^[a-h][1-8]$/',(string)$from)){
      $errors[]='Invalid string from.';
    }
    if(!preg_match('/^[a-h][1-8]$/',(string)$to)){
      $errors[]='Invalid string to.';
    }
    if(!preg_match('/^(b|w)(K|Q|B|N|R|P)$/',(string)$piece)){
      $errors[]='Invalid string piece.';
    }
    /* check errors */
    if(!empty($errors)){
      return [
        'token'=>$token,
        'error'=>'Error: '.$errors[0],
        'errors'=>$errors,
        'input'=>func_get_args(),
      ];
    }
    $token=preg_replace('/[^a-f0-9]+/','',(string)$token);
    $fen=(string)$fen;
    $pawnTwo=(string)$pawnTwo;
    $db=$this->root();
    $sel=$sel=$db->query('select * from games where token="'.$token.'"');
    if(!isset($sel[0])){
      return [
        'token'=>$token,
        'error'=>'Error: Game is not available.',
      ];
    }
    $data=(object)$sel[0];
    if($data->white!=$id&&$data->black!=$id){
      return [
        'token'=>$token,
        'error'=>'Error: You have no access to this game.',
        'data'=>$data,
      ];
    }$ori=$data->black==$id?'black':'white';
    if($ori!==$data->turn){
      return [
        'token'=>$token,
        'error'=>'Error: It is not your turn.',
      ];
    }
    $turn=$data->turn=='white'?'black':'white';
    $update=$db->query('update games '.http_build_query([
      'fen'=>'string:'.$fen,
      'turn'=>'string:'.$turn,
      'pawnTwo'=>'string:'.$pawnTwo,
    ]).' where token="'.$token.'"');
    $db->query('insert into history '.http_build_query([
      'fen'=>'string:'.$fen,
      'turn'=>'string:'.$turn,
      'token'=>'string:'.$token,
      'from'=>'string:'.$from,
      'to'=>'string:'.$to,
      'piece'=>'string:'.$piece,
    ]));
    return $this->select($token);
  }
  /* select from token */
  public function select($token=null){
    if(!preg_match('/^[a-f0-9]{32}$/',$token)){
      return [
        'token'=>$token,
        'error'=>'Error: Invalid token.',
      ];
    }
    $db=$this->root();
    $sel=$db->query('select * from games where token="'.$token.'"');
    if(!isset($sel[0])){
      return [
        'token'=>$token,
        'error'=>'Error: Game is not available.',
      ];
    }return $sel[0];
  }
  /* select registered users */
  public function users($session=null,$id=null){
    $output=['session'=>$session,'status'=>'OK'];
    if(!preg_match('/^\d+$/',$id)){
      $output['status']='Error: Invalid user ID.';
      return $output;
    }$db=$this->root();
    $sel=$db->query('select id,username,point from users where id='.$id);
    if(!isset($sel[0])){
      $output['status']='Error: User ID is not available.';
      return $output;
    }
    $users=$db->query('select id,username,point from users');
    $output['user']=$sel[0];
    $output['data']=is_array($users)?$users:[];
    return $output;
  }
  /* login */
  public function login($session=null,$username=null,$password=null){
    $output=['session'=>$session,'status'=>'OK'];
    if(!preg_match('/^[a-z0-9]+$/',$username)){
      $output['status']='Error: Invalid username.';
      return $output;
    }$db=$this->root();
    $sel=$db->query('select id,username,point from users where username="'.$username.'"');
    if(!isset($sel[0])){
      $output['status']='Error: Username is not available.';
      return $output;
    }
    $output['user']=$sel[0];
    return $output;
  }
  /* register a new user */
  public function register($session=null,$username=null,$password=null){
    $output=['session'=>$session,'status'=>'OK'];
    if(!preg_match('/^[a-z0-9]+$/',$username)){
      $output['status']='Error: Invalid username.';
      return $output;
    }
    $db=$this->root();
    $sel=$db->query('select * from users where username="'.$username.'"');
    if(isset($sel[0])){
      $output['status']='Error: Username has been taken.';
      return $output;
    }
    $db->query('insert into users '.http_build_query([
      'username'=>'string:'.$username,
      'password'=>'string:'.password_hash($password,PASSWORD_BCRYPT)
    ]));
    return $output;
  }
  /* create database connection */
  private function root(){
    /* check connected database */
    if($this->root){return $this->root;}
    /* connect a database */
    $db=new sdb('localhost','master','luthfie','chess');
    if(!$db->error){$this->root=$db;return $db;}
    /* create one while does not exist */
    $db=new sdb('localhost','root','','root');
    $db->query('create database db=chess&user=master&pass=luthfie');
    /* connect to the created one */
    $db=new sdb('localhost','master','luthfie','chess');
    /* create tables */
    $db->query('create table users id=aid()&username=string()&password=string()&point=int()');
    $db->query('create table games id=aid()&white=int()&black=int()&fen=string()'
      .'&turn=string()&token=string()&&pawnTwo=string()&status=string()');
    $db->query('create table history id=aid()&fen=string()&turn=string()&token=string()'
      .'&from=string()&to=string()&piece=string()');
    /* return the databse */
    return $db;
  }
}
