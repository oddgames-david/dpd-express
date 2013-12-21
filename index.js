var util = require('util')
  , Resource = require('deployd/lib/resource')
  , express = require('express')
  , path = require('path')
    , fs = require('fs');
  
function ExpressEJS(name, options) {
  Resource.apply(this, arguments);
  var app = this.app = express()
    , exp = this;
  
    // handle all routes
    this.path = '/';

    var ejs = require('ejs');
    ejs.open = '{{';
    ejs.close = '}}';

    var oneDay = 86400000;
    app.use(express.compress());

    app.configure(function(){
        app.set("view options", {layout: false});
        app.engine('html', require('ejs').renderFile);
        app.set('view engine', 'html');
        app.set('views', __dirname + "/../../public/");
    });

    app.all("*", function(req, res, next)
    {

        var request = req.params[0];
        var view = request.substr(1, request.length-1);
        var file = path.resolve(__dirname + "/../../public/" + request);
        var exists = fs.existsSync(file);
        var html = (view.substr(view.length - 4) === "html");
        var onlySlashes = (request.replace(/\/+$/, "") == "");

        if (html && exists && !onlySlashes)
        {
            res.render(view);
        }
        else if (onlySlashes)
        {
            res.render("index.html");
        }
        else if (exists)
        {
            res.sendfile(file);
        }
        else if (html)
        {
            res.render("404.html", {page: view});
        }
        else
        {
            next();
        }

    });

    app.use(express.static(__dirname + '../../public', { maxAge: oneDay }));

}

ExpressEJS.events = ['init'];

util.inherits(ExpressEJS, Resource);
module.exports = ExpressEJS;

ExpressEJS.prototype.handle = function (ctx, next) {
  ctx.req.dpd = ctx.dpd;
  ctx.req.me = ctx.session && ctx.session.user;
  this.app.call(this.server, ctx.req, ctx.res);
  if(ctx.res._finished) {
    next();
  }
}

ExpressEJS.prototype.load = function (fn) {
  var e = this;
  Resource.prototype.load.call(this, function () {
    if(e.events && e.events.init) {
      
      var domain = {
          app: e.app
        , require: function () {
          return require.apply(module, arguments);
        }
      }
      
      e.events.init.run({}, domain);
      
      e.app.use(function (req, res) {
        res._finished = true;
      });
    }  
      
    fn();
  });
}

