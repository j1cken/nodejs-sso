var Keycloak = require('keycloak-connect');

var express = require('express');
var session = require('express-session')

var app = express();

// Allow passing in a port from the command-line.
var p = 3000;
if ( process.argv.length >= 3 ) {
  p = Number( process.argv[2] );
}

app.set('port', p );

// Create a session-store to be used by both the express-session
// middleware and the keycloak middleware.

var memoryStore = new session.MemoryStore();

app.use( session({
  secret: 'aaslkdhlkhsd',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
} ))


// Provide the session store to the Keycloak so that sessions
// can be invalidated from the Keycloak console callback.
//
// Additional configuration is read from keycloak.json file
// installed from the Keycloak web console.

var keycloak = new Keycloak({
  store: memoryStore
});

// Install the Keycloak middleware.
//
// Specifies that the user-accessible application URL to
// logout should be mounted at /logout
//
// Specifies that Keycloak console callbacks should target the
// root URL.  Various permutations, such as /k_logout will ultimately
// be appended to the admin URL.

app.use( keycloak.middleware( {
  logout: '/logout',
  admin: '/',
} ));


// A normal un-protected public URL.

app.get( '/', function(req,resp) {
  resp.send( "Howdy!" );
} )


// A protection guard can take up to 3 arguments, and is passed
// the access_token, the HTTP request and the HTTP response.
//
// The token can be tested for roles:
//
// * 'foo' is a simple application role 'foo' for the current application
// * 'bar:foo' is an application role 'foo' for the application 'bar'
// * 'realm:foo' is a realm role 'foo' for the application's realm
//
// A protection guard can be passed to keycloak.protect(...) for any
// URL.  If it returns true, then the request is allowed.  If false,
// access will be denied.

var groupGuard = function(token, req, resp) {
  return token.hasRole( req.params.group );
}

// The keycloak.protect(...) function can take a guard function to perform
// advanced protection of a URL.
//
// Additionally (not shown) it can take simple string role specifier identical
// to those used above by token.hasRole(...).
//
// In all cases, if a user is not-yet-authenticated, the Keycloak token authentication
// dance will begin by redirecting the user to the Keycloak login screen.  If
// authenticated correctly with Keycloak itself, the workflow continues to exchange
// the Keycloak-provided for a signed Keycloak access_token.
//
// A user's authentication may be provided through the HTTP session (via cookies)
// or through Bearer authentication header.
//
// In the event a user is authenticated, but his access-token has expired, if a
// refresh-token is available, the middleware will attempt to perform a refresh.
//
// All of the above workflow is transparent to the user, who ultimately will
// access the requested resource or be denied, modulo an initial login through
// Keycloak itself.

app.get( '/:group/:page', keycloak.protect( groupGuard ), function(req,resp) {
  resp.send( 'Page: ' + req.params.page + ' for Group: ' + req.params.group + '<br><a href="/logout">logout</a>');
})

// A simple keycloak.protect() ensures that a user is authenticated
// but provides no additional RBAC protection.

app.get( '/:page', keycloak.protect(), function(req,resp) {
  resp.send( 'Page: ' + req.params.page + '<br><a href="/logout">logout</a>');
} );

var server = app.listen(app.settings.port, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Example app listening at http://%s:%s', host, port)
})
