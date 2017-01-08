var http = require( 'http' ),
    mongo = require( 'mongodb' ).MongoClient ,
    dbURI = process.env.MONGOLAB_URI ,
    port = 8080 ;

var urlString = "abcdfghijklmnopqrstuvwzyzABCDFGHIJKLMNOPQRSTUVWXYZ" ;
var urlStringLength = urlString.length ;

function numb(n){

	return urlString[n % urlStringLength ];
}

function shortenURL( url, cnt ){

	var pow = 6 ,
	    newURL = '';

	while( pow > 0 ){
		var n = Math.pow( urlStringLength , pow-- ) ;
		if( ( cnt / n ) >= 1 ){
			var j = Math.floor( cnt / n ) - 1;
			newURL += numb ( j ) ;
			cnt -= n ;
		}
	}

	newURL += numb( cnt ) ;

	return newURL ;
}

var server = http.createServer( function( req , res ) {

	var host = req.headers[ 'x-forwarded-proto' ] + '://' +  req.headers[ 'host' ] + '/' ;

	mongo.connect( dbURI , function( err , db ) {
		if (err) throw err
		var url = req.url ,
		    URLs = db.collection( 'shorturl' ) ;

		if ( url == '/' ) {
			res.writeHead( 200 , { 'Content-Type': 'application/json' } ) ;
			res.end( JSON.stringify( {"url":null,"shortURL":null} ) ) ;
			db.close( ) ;

		} else {

			url = url.substr( 1 , url.length - 1 ) ;
			var json = { url: url, shortURL: null } ;
			var urlCount = URLs.count( {} , function( err, count ) {
				if (err) throw err
				if( url.toLowerCase().indexOf('http://') > -1 || url.toLowerCase().indexOf('https://') > -1 ) {

					URLs.find( {
						url : {
							$eq : url
						}
					}, {
						url : 1 ,
						shortURL : 1 ,
						_id : 0
					} ).toArray( function( err , docs ) {
						if ( err ) throw err ;
						if( docs.length === 0 ) {

							json.shortURL = shortenURL( url, count ) ;

							URLs.insert( json , function( err,  data)  {
        	                                        	if ( err ) throw err ;
                	                                } ) ;

							json = { url : json.url, shortURL : host + json.shortURL } ;

						} else {

							json.shortURL = host + docs[ 0 ].shortURL ;
						}

						res.writeHead( 200 , { 'Content-Type': 'application/json' } ) ;
						var response = JSON.stringify( json ) ;
						db.close( ) ;
						res.end( response ) ;
					} )

				} else {

					URLs.find( {
                                                 shortURL : {
                                                        $eq : url
                                                }
                                        } , {
                                                url : 1 ,
                                                shortURL : 1 ,
                                                _id : 0
                                        } ).toArray( function( err , docs ) {
                                                if ( err ) throw err ;
                                                if( docs.length === 0 ) {

							json = { "error" : "Invalid URL" } ;

							res.writeHead( 200 , { 'Content-Type': 'application/json' } ) ;
							var response = JSON.stringify( json ) ;
                                                	db.close( ) ;
                                                	res.end( response ) ;

                                                } else {

							res.writeHead( 302 , { 'Location' : docs[ 0 ].url } ) ;
							db.close( ) ;
							res.end( );
                                                }
                                        } )
				}
			} )
		}
	} ) 
} ) ;

server.listen( process.env.PORT || port );
