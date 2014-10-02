var express = require('express');
var session = require('express-session');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  if(req.session.access_token != null) {
    res.render('apps');
  }else{
    res.render('index', { title: 'Express' });
  }
});

router.get('/apps', function(req, res) {
 res.render('apps');
});

module.exports = router;
