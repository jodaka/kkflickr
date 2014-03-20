/*global CryptoJS, $ */

console.log( 'flickr api loaded' );

// document.addEventListener( 'DOMContentLoaded', function() {

( function() {

    'use strict';

    var prepareHTML = function() {

        var holder = $( '<div id="flickrBridge">' )
            .append(
                $( '<div id="auth" style="display:none">' ).append(
                    $( '<button>AUTH</button> ' ).on( 'click', requestFrob )
                )
        )
            .append(
                $( '<div id="upload" style="display:none">' )
                .append( $( '<button>Upload</button> ' ).on( 'click', uploadDialog ) )
                .append( $( '<input type="file" name="flickrUploadFile" id="flickrUploadFile"/>' ) )
        );

        $( document.body ).append( holder );

        console.log( document.body, holder );

        // <div id="auth" style='display: none'>
        //     <button onclick="flickr.requestFrob()">AUTH</button>
        // </div>
        // <div id="upload" style='display: none'>
        //     <button onclick="flickr.uploadDialog()">Upload</button>
        //     <input type="file" name="flickrUploadFile" id="flickrUploadFile" />
        // </div>

    };



    var cfg = {
        key: '1214d981477adc7e17d5c50ee0eef5bd',
        secret: '3db6fbef55dbdda6',
        baseURL: 'http://flickr.com/services/'
    };

    //http://flickr.com/services/rest/?method=flickr.auth.getToken&api_key=1234567890&frob=abcxyz&api_sig=3f3870be274f6c49b3e31a0c6728957f

    /**
     * [ description]
     * @param  {[type]} request [description]
     * @return {[type]}         [description]
     */
    var signRequest = function( request ) {

        var pairs = request.split( '&' );
        var params = [];
        var i;

        for ( i = 0; i < pairs.length; i++ ) {
            params.push( pairs[ i ].split( '=' ) );
        }
        params.push( [ 'api_key', cfg.key ] );

        // console.warn('params=', params);

        var sorted = params.sort( function( a, b ) {
            if ( a[ 0 ] > b[ 0 ] )
                return 1;
            if ( a[ 0 ] < b[ 0 ] )
                return -1;
            return 0;
        } );

        var paramsString = cfg.secret;
        for ( i = 0; i < sorted.length; i++ ) {
            paramsString += '' + sorted[ i ][ 0 ] + sorted[ i ][ 1 ];
        }

        console.log( 'paramsString=' + paramsString + '<<< hash=' + CryptoJS.MD5( paramsString ) );
        return '?api_key=' + cfg.key + '&' + request + '&api_sig=' + CryptoJS.MD5( paramsString );
    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var requestFrob = function() {
        location.href = cfg.baseURL + 'auth/' + signRequest( 'perms=write' );
    };

    /**
     * [ description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    var onAuthToken = function( data ) {

        console.log( 'GOT DATA', data );

        if ( data && data.stat === 'ok' && data.auth && data.auth.token && data.auth.token._content ) {

            var flickrAuth = localStorage.getItem( 'flickrAuth' );

            try {
                flickrAuth = ( flickrAuth ) ? JSON.parse( flickrAuth ) : {};
            } catch ( e ) {
                flickrAuth = {};
            }

            if ( !flickrAuth || !flickrAuth.token ) {
                flickrAuth = {
                    token: data.auth.token._content
                };
            } else {
                flickrAuth.token = data.auth.token._content;
            }
            cfg.token = data.auth.token._content;
            console.log( 'stored ', JSON.stringify( flickrAuth ), ' auth=', flickrAuth );
            localStorage.setItem( 'flickrAuth', JSON.stringify( flickrAuth ) );

            showUploadButton();

        } else {
            console.warn( ' error in data' );
            showLoginButton();
        }

    };

    var onUpload = function( data ) {

        console.log( '====', data );
    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var uploadDialog = function() {

        var resultFired = false;


        var photo = document.getElementById( 'flickrUploadFile' ).files[ 0 ];

        var formData = new FormData();
            formData.append( 'photo', photo );

        // encoding params
        var params = signRequest( 'title=test&hidden=2&format=json&is_public=0&auth_token=' + cfg.token ).replace(/^\?/, '').split('&');

        for (var i = 0; i < params.length; i++) {
            var pair = params[i].split('=');
            formData.append( pair[0], pair[1] );
        }

        var xhr = new XMLHttpRequest();

        // progress indicator
        xhr.upload.addEventListener( 'progress', function ( progress ) {
            var perc = Math.round( progress.loaded * 100 / progress.totalSize );
            console.log( ' progress = ', perc, '%' );
        }, false );



        xhr.addEventListener( 'readystatechange', function ( evt ) {

            if ( ! evt || ! evt.target ) {
                return;
            }

            if ( ! resultFired && evt.target.readyState === 4 ) {
                resultFired = true;
                console.log( evt, evt.target.responseText );
            }
        }, false );

        xhr.open( 'post', cfg.baseURL + 'upload/', true );
        xhr.send( formData );
    };

    var makeJSONPrequest = function ( url ) {

        var script = document.createElement( 'script' );
        script.src = url;
        document.body.appendChild( script );
    };

    /**
     * [ description]
     * @return {[type]} [description]
     */
    var showLoginButton = function() {
        console.log( ' showing login button' );
        document.getElementById( 'auth' ).style.display = 'block';
    };

    var showUploadButton = function() {
        document.getElementById( 'upload' ).style.display = 'block';
    };

    /**
     * [ description]
     * @param  {[type]} url [description]
     * @return {[type]}     [description]
     */
    var checkAuth = function( url ) {

        var savedAuth = localStorage.getItem( 'flickrAuth' );
        if ( savedAuth ) {

            console.log( 'parsing ', savedAuth );
            try {
                savedAuth = JSON.parse( savedAuth );
            } catch ( e ) {
                savedAuth = {};
            }

            if ( savedAuth && savedAuth.token ) {
                console.log( 'ffound saved auth data', savedAuth );
                cfg.token = savedAuth.token;
                showUploadButton();
                return;
            }
        }

        if ( /frob=/.test( url ) ) {
            var frob = url.replace( /.*frob=(.*?)$|\?|\&/, '$1' );
            console.log( 'GOT IT!!! FROB = ', frob );
            makeJSONPrequest( cfg.baseURL + 'rest/' + signRequest( 'method=flickr.auth.getToken&jsoncallback=flickr.onAuthToken&format=json&frob=' + frob ) );
            // http://gitdev:81/kkflickr/menu.html?frob=72157642546686494-a4abd0abf2cd4346-7498461
        } else {
            showLoginButton();
        }
    };

    prepareHTML();

    // checking FROB
    checkAuth( location.href );

    return {
        requestFrob: requestFrob,
        onAuthToken: onAuthToken,
        uploadDialog: uploadDialog,
        onUpload: onUpload
    };

}() );

// }, false );