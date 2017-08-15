var FacebookStrategy = require('passport-facebook').Strategy; // Import Passport-Facebook Package
var TwitterStrategy = require('passport-twitter').Strategy; // Import Passport Twitter Package
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy; // Import Passport Google Package
var User = require('../models/user'); // Import User Model
var session = require('express-session'); // Import Express Session Package
var jwt = require('jsonwebtoken'); // Import JWT Package
var secret = 'harrypotter'; // Create custom secret to use with JWT

module.exports = function(app, passport) {
    // Start Passport Configuration Settings
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true, cookie: { secure: false } }));
    // End Passport Configuration Settings

    // Serialize users once logged in   
    passport.serializeUser(function(user, done) {
        // Check if the user has an active account
        if (user.active) {
            // Check if user's social media account has an error
            if (user.error) {
                token = 'unconfirmed/error'; // Set url to different error page
            } else {
                token = jwt.sign({ username: user.username, email: user.email }, secret, { expiresIn: '24h' }); // If account active, give user token
            }
        } else {
            token = 'inactive/error'; // If account not active, provide invalid token for use in redirecting later
        }
        done(null, user.id); // Return user object
    });

    // Deserialize Users once logged out    
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user); // Complete deserializeUser and return done
        });
    });

    // Facebook Strategy    
    passport.use(new FacebookStrategy({
            clientID: '313983899013671', // Replace with your Facebook Developer App client ID
            clientSecret: 'a2a72a62807cfc0dc6b31a8108804390', // Replace with your Facebook Developer client secret
            callbackURL: "http://amgine.herokuapp.com/auth/facebook/callback", // Replace with your Facebook Developer App callback URL
            profileFields: ['id', 'displayName', 'photos', 'email']
        },
        function(accessToken, refreshToken, profile, done) {
            User.findOne({ email: profile._json.email }).select('username active password email').exec(function(err, user) {
                if (err) done(err);

                if (user && user !== null) {
                    done(null, user);
                } else {
                    done(err);
                }
            });
        }
    ));

    // Twitter Strategy
    passport.use(new TwitterStrategy({
            consumerKey: 'nAsRdF40TX5fQ7QivmuJGWWSj', // Replace with your Twitter Developer App consumer key
            consumerSecret: 'WH4MaKulaiPzrBttgS5KlQzanXmZIKZ4hmAlflfwX8jk3WNTwA', // Replace with your Twitter Developer App consumer secret
            callbackURL: "http://amgine.herokuapp.com//auth/twitter/callback", // Replace with your Twitter Developer App callback URL
            userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true"
        },
        function(token, tokenSecret, profile, done) {
            if (profile.emails) {
                User.findOne({ email: profile.emails[0].value }).select('username active password email').exec(function(err, user) {
                    if (err) {
                        done(err);
                    } else {
                        if (user && user !== null) {
                            done(null, user);
                        } else {
                            done(err);
                        }
                    }
                });
            } else {
                user = {}; // Since no user object exists, create a temporary one in order to return an error
                user.id = 'null'; // Temporary id
                user.active = true; // Temporary status
                user.error = true; // Ensure error is known to exist
                done(null, user); // Serialize and catch error
            }
        }
    ));

    // Google Strategy  
    passport.use(new GoogleStrategy({
            clientID: '1072623354876-17e5pg24gkhanmcv5chcosr1jqpd0s1m.apps.googleusercontent.com', // Replace with your Google Developer App client ID
            clientSecret: 'iywlCd8I6UBPlwY1LOeYLEz9', // Replace with your Google Developer App client ID
            callbackURL: "http://amgine.herokuapp.com/auth/google/callback" // Replace with your Google Developer App callback URL
        },
        function(accessToken, refreshToken, profile, done) {
            User.findOne({ email: profile.emails[0].value }).select('username active password email').exec(function(err, user) {
                if (err) done(err);

                if (user && user !== null) {
                    done(null, user);
                } else {
                    done(err);
                }
            });
        }
    ));

    // Google Routes    
    app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'profile', 'email'] }));
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/googleerror' }), function(req, res) {
        res.redirect('/google/' + token); // Redirect user with newly assigned token
    });

    // Twitter Routes
    app.get('/auth/twitter', passport.authenticate('twitter'));
    app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/twittererror' }), function(req, res) {
        res.redirect('/twitter/' + token); // Redirect user with newly assigned token
    });

    // Facebook Routes
    app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/facebookerror' }), function(req, res) {
        res.redirect('/facebook/' + token); // Redirect user with newly assigned token
    });
    app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

    return passport; // Return Passport Object
};
