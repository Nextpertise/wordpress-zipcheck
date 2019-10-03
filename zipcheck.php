<?php
/**
* Plugin Name: Nextpertise Postcode Check
* Description: Nextpertise plugin that checks the services we can provide at a certain adress.
* Version: 0.1
* Author: Nathan Klumpenaar | Nextpertise
* Author URI: https://www.nextpertise.nl/
**/

/// Adds plugin JavaScript and CSS to the page
function nextpostcheck_enqueue_scripts(){
    // CSS
    wp_register_style( 'zipcheck_css', plugin_dir_url(__FILE__).'zipcheck.css');
    wp_enqueue_style('zipcheck_css');

    // JavaScript
    wp_register_script( 'zipcheck-input_js', plugin_dir_url(__FILE__).'zipcheck-input.js', array('jquery') );
    wp_localize_script( 'zipcheck-input_js', 'zipcheck_ajax', array( 'ajax_url' => admin_url( 'admin-ajax.php' )));              
    wp_enqueue_script( 'jquery' );
    wp_enqueue_script( 'zipcheck-input_js' );

    // Following scripts only need to be enqueued on results (postcode-check) page.
    if(is_page("postcode-check")){
        wp_register_script( 'zipcheck-results_js', plugin_dir_url(__FILE__).'zipcheck-results.js', array('jquery') );
        wp_localize_script( 'zipcheck-results_js', 'zipcheck_ajax', array( 'ajax_url' => admin_url( 'admin-ajax.php' )));  
        wp_enqueue_script( 'zipcheck-results_js' );
    }
}
add_action( 'wp_enqueue_scripts', 'nextpostcheck_enqueue_scripts' );



/// Register AJAX function for both logged in and logged out users.
add_action( 'wp_ajax_nextzipcheck_get_housenr', 'nextzipcheck_get_housenr' );
add_action( 'wp_ajax_nopriv_nextzipcheck_get_housenr', 'nextzipcheck_get_housenr' );
add_action( 'wp_ajax_nextzipcheck_get_housenrext', 'nextzipcheck_get_housenrext' );
add_action( 'wp_ajax_nopriv_nextzipcheck_get_housenrext', 'nextzipcheck_get_housenrext' );
add_action( 'wp_ajax_nextzipcheck_get_all_providers', 'nextzipcheck_get_all_providers' );
add_action( 'wp_ajax_nopriv_nextzipcheck_get_all_providers', 'nextzipcheck_get_all_providers' );
add_action( 'wp_ajax_nextzipcheck_get_available_per_provider', 'nextzipcheck_get_available_per_provider' );
add_action( 'wp_ajax_nopriv_nextzipcheck_get_available_per_provider', 'nextzipcheck_get_available_per_provider' );

/// Function that handles ALL api requests.
/// Returns an array containing the response array and success bool.
function nextzipcheck_api_request($url, $request_data){
    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => $request_data,
        CURLOPT_HTTPHEADER => array(
            "Authorization: Basic d3d3LXdlYnNpdGVAbmV4dHBlcnRpc2Uubmw6YVFmN1N2N3FkOFo4VmNuODhNdzlLeXM5dTE3MUhvMjcyRQ==",
            "Content-Type: application/json",
        ),
    ));

    $response = curl_exec($curl);
    $err = curl_error($curl);
    
    if(!$err){
        return ['success'=>true, 'response'=> json_decode($response)];
    }
    return ['success'=>false, 'response'=> $err];
}


/// Function that is invoked by AJAX to get relevant housenumbers
function nextzipcheck_get_housenr(){
    $request_data = json_encode(array(
        "jsonrpc" => "2.0",
        "id" => 1,
        "method" => "get_housenrs",
        "params" => array(
            "zipcode" => strtoupper($_POST['zipcode'])
        )
    ));

    $api_request = nextzipcheck_api_request("https://api.nextpertise.nl/postcodes/v1", $request_data);

    if($api_request['success']){
        echo json_encode($api_request['response']->result->housenrs);
    }

    wp_die();
}

/// Function that is invoked by AJAX to get relevant exentions
function nextzipcheck_get_housenrext(){
    $curl = curl_init();

    $request_data = json_encode(array(
        "jsonrpc" => "2.0",
        "id" => 1,
        "method" => "get_housenrext",
        "params" => array(
            "zipcode" => strtoupper($_POST['zipcode']),
            "housenr" => (int) strtoupper($_POST['housenr'])
        )
    ));

    $api_request = nextzipcheck_api_request("https://api.nextpertise.nl/postcodes/v1", $request_data);
    
    if($api_request['success']){
        $result = $api_request['response']->result;
        $extlist = array_unique(array_merge(["-"], $result->CADASTRAL->housenrexts, $result->KPNWBA->housenrexts, $result->KPNWEAS->housenrexts));
        echo json_encode($extlist);
    }

    wp_die();
}

/// Function that is invoked by AJAX to get all providers
function nextzipcheck_get_all_providers(){
    $request_data = json_encode(array(
        "jsonrpc" => "2.0",
        "id" => 1,
        "method" => "list_providers",
        "params" => array()
    ));

    $api_request = nextzipcheck_api_request("https://api.nextpertise.nl/broadband/v1", $request_data);

    if($api_request['success']){
        $result = $api_request['response']->result;
        echo json_encode($result->providers);
    }

    wp_die();
}

/// Function that is invoked by AJAX to get an overview of the technologies and maximum speeds available at a specific location.
function nextzipcheck_get_available_per_provider(){
    $request_data = json_encode(array(
        "jsonrpc" => "2.0",
        "id" => 1,
        "method" => "zipcode",
        "params" => array(
            "zipcode" => strtoupper($_POST['zipcode']),
            "housenr" => (int) ($_POST['housenr']),
            "housenrext" => str_replace("-", "", ($_POST['housenrext'])),
            "filter" => array(
                "provider" => [$_POST['provider']]
            )
        )
    ));

    $api_request = nextzipcheck_api_request("https://api.nextpertise.nl/broadband/basic/v1", $request_data);

    if($api_request['success']){
        $result = $api_request['response']->result;
        echo json_encode($result);
    }

    wp_die();
}