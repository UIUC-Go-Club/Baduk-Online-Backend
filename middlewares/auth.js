var jwt = require('jsonwebtoken');
var config = require('../env.js');

module.exports = function (req, res, next) {

    // Check if authorization header is set
    if (req.hasOwnProperty('headers') && req.headers.hasOwnProperty('authorization')) {
        try {
            // Try to decode & verify the JWT token
            let auth = req.headers['authorization'].split(' ')
            if(auth[0] !== 'bearer'){
                return res.status(401).json({
                    error: {
                        msg: 'authorization needs to be: bearer <token>'
                    }
                });
            }
            let token = auth[1]
            req.user = jwt.verify(token, config.JWT_SECRET);
        } catch (err) {
            //  If the authorization header is corrupted, it throws exception
            //  So return 401 status code with JSON error message
            return res.status(401).json({
                error: {
                    msg: 'Failed to authenticate token!'
                }
            });
        }
    } else {
        // If there is no autorization header, return 401 status code with JSON
        // error message
        return res.status(401).json({
            error: {
                msg: 'No token!'
            }
        });
    }
    next();
    return;
};
