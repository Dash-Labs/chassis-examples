<?php

require_once 'Slim/Slim.php';
require_once 'classes/Dash.class.php';

\Slim\Slim::registerAutoloader();
$app = new \Slim\Slim();

$app->notFound(function () use ($app) {
    $app->render('404.html');
});

// redirect to Dash OAuth2 Login
$app->get('/login', function() use ($app) {
  $app->redirect("https://dash.by/api/auth/authorize?response_type=code&client_id=" . 
    Config::$client_id . "&scope=" . Config::$scope . "&state=" . Config::$state);
});

// Redirect_URL set on Dash
$app->get('/authorize', function() use ($app) {
  $code = $app->request->get('code');
  $state = $app->request->get('state');

  if ($state != Config::$state || !isset($code)) {
    $app->redirect($app->urlFor('ini'));
  } else {
    $token = Dash::authorize($code);
    session_start();
    $_SESSION[Config::$token] = $token;
    $app->redirect($app->urlFor('ini'));
  }
})->name('authorize');

$app->get('/api/heatmap', function() use ($app) {
  session_start();
  if(isset($_SESSION[Config::$token])){ 
    Dash::heatmap();
  } else {
    $app->redirect($app->urlFor('ini'));
  }
});

$app->get('/heatmap', function() use ($app) {
  session_start();
  if(isset($_SESSION[Config::$token])){ 
    $app->render('heatmap.php');
  } else {
    $app->redirect($app->urlFor('ini'));
  }
});

$app->get('/', function() use ($app) {
  session_start();
  if(isset($_SESSION[Config::$token])){ 
    $app->render('navigation.php');
  } else {
    $app->render('login.php');
  }
})->name('ini');

$app->run();
