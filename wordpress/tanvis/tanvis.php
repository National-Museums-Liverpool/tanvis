<?php
/**
 * Plugin Name: Tanvis
 * Description: Embed Tanvis biological record visualisations using the [tanvis] shortcode.
 * Version: 1.3.4
 * License: GPL-3.0-only
 * Text Domain: tanvis
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TANVIS_WP_VERSION     = '1.3.4';
const TANVIS_WP_DEFAULT_API = 'https://tanhub.northwestinvertebrates.org.uk/api/v1';
const TANVIS_WP_OPTION      = 'tanvis_api_base';

function tanvis_wp_api_base() {
	$value = get_option( TANVIS_WP_OPTION, TANVIS_WP_DEFAULT_API );
	return $value ? $value : TANVIS_WP_DEFAULT_API;
}

/* ---------- Settings ---------- */

add_action(
	'admin_init',
	function () {
		register_setting(
			'tanvis_settings',
			TANVIS_WP_OPTION,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
				'default'           => TANVIS_WP_DEFAULT_API,
			)
		);
		add_settings_section( 'tanvis_main', '', '__return_false', 'tanvis' );
		add_settings_field(
			TANVIS_WP_OPTION,
			__( 'API base URL', 'tanvis' ),
			function () {
				printf(
					'<input type="url" class="regular-text" name="%s" value="%s" />',
					esc_attr( TANVIS_WP_OPTION ),
					esc_attr( tanvis_wp_api_base() )
				);
			},
			'tanvis',
			'tanvis_main'
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page(
			__( 'Tanvis', 'tanvis' ),
			__( 'Tanvis', 'tanvis' ),
			'manage_options',
			'tanvis',
			function () {
				echo '<div class="wrap"><h1>' . esc_html__( 'Tanvis', 'tanvis' ) . '</h1><form method="post" action="options.php">';
				settings_fields( 'tanvis_settings' );
				do_settings_sections( 'tanvis' );
				submit_button();
				echo '</form></div>';
			}
		);
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		if ( current_user_can( 'manage_options' ) ) {
			$settings_link = sprintf(
				'<a href="%s">%s</a>',
				esc_url( admin_url( 'options-general.php?page=tanvis' ) ),
				esc_html__( 'Settings', 'tanvis' )
			);
			array_unshift( $links, $settings_link );
		}
		return $links;
	}
);

/* ---------- Assets ---------- */

// Called lazily: shortcodes also render during REST saves, where wp_enqueue_scripts never fires.
function tanvis_wp_register_assets() {
	$base = plugin_dir_url( __FILE__ ) . 'assets/';
	$v    = TANVIS_WP_VERSION;

	$styles = array(
		'tanvis-leaflet'   => 'leaflet.css',
		'tanvis-tabulator' => 'tabulator.min.css',
		'tanvis-brcatlas'  => 'brcatlas.umd.css',
		'tanvis-brccharts' => 'brccharts.umd.css',
	);
	foreach ( $styles as $handle => $file ) {
		if ( ! wp_style_is( $handle, 'registered' ) ) {
			wp_register_style( $handle, $base . $file, array(), $v );
		}
	}

	$scripts = array(
		'tanvis-d3'       => array( 'd3.v7.min.js', array() ),
		'tanvis-leaflet'  => array( 'leaflet.js', array() ),
		'tanvis-tabulator'=> array( 'tabulator.min.js', array() ),
		'tanvis-brcatlas' => array( 'brcatlas.min.umd.js', array( 'tanvis-d3' ) ),
		'tanvis-brccharts'=> array( 'brccharts.min.umd.js', array( 'tanvis-d3' ) ),
		'tanvis'          => array( 'tanvis.iife.js', array() ),
	);
	foreach ( $scripts as $handle => $script ) {
		if ( ! wp_script_is( $handle, 'registered' ) ) {
			wp_register_script( $handle, $base . $script[0], $script[1], $v, true );
		}
	}

	static $inline_scripts_added = false;
	if ( ! $inline_scripts_added ) {
		wp_add_inline_script(
			'tanvis',
			'window.Tanvis = window.Tanvis || {}; window.Tanvis.config = Object.assign(window.Tanvis.config || {}, ' . wp_json_encode( array( 'apiBase' => tanvis_wp_api_base(), 'assetBase' => $base ) ) . ');',
			'before'
		);
		wp_add_inline_script( 'tanvis', 'window.Tanvis.init();' );
		$inline_scripts_added = true;
	}
}

function tanvis_wp_enqueue_content_assets() {
	if ( ! is_singular() ) {
		return;
	}

	$post = get_queried_object();
	if ( ! $post || empty( $post->post_content ) ) {
		return;
	}

	$pattern = '/' . get_shortcode_regex( array( 'tanvis' ) ) . '/';
	if ( ! preg_match_all( $pattern, $post->post_content, $matches, PREG_SET_ORDER ) ) {
		return;
	}

	foreach ( $matches as $match ) {
		$attributes = shortcode_parse_atts( $match[3] );
		if ( ! is_array( $attributes ) || empty( $attributes['type'] ) ) {
			continue;
		}

		$map_type = isset( $attributes['map-type'] ) ? $attributes['map-type'] : ( $attributes['map_type'] ?? 'static' );
		tanvis_wp_enqueue( $attributes['type'], $map_type );
	}
}
add_action( 'wp_enqueue_scripts', 'tanvis_wp_enqueue_content_assets', 20 );

// Returns the asset handles (script and style share names) a visualisation needs.
function tanvis_wp_needs( $type, $map_type ) {
	switch ( $type ) {
		case 'new-species-table':
		case 'increasing-species-table':
		case 'species-absent-table':
		case 'records-table':
			return array( 'tabulator' );
		case 'species-map':
		case 'grid-stats-map':
			// brcatlas captures the Leaflet global when it loads, so Leaflet must precede it.
			return in_array( $map_type, array( 'leaflet', 'switch' ), true )
				? array( 'leaflet', 'brcatlas' )
				: array( 'brcatlas' );
		case 'temporal-year-chart':
			return array( 'brccharts' );
		default:
			return array();
	}
}

function tanvis_wp_enqueue( $type, $map_type ) {
	tanvis_wp_register_assets();

	$scripts = wp_scripts();
	$deps    = array();
	$styles  = array();

	foreach ( tanvis_wp_needs( $type, $map_type ) as $name ) {
		$style = 'tanvis-' . $name;
		wp_enqueue_style( $style );
		$styles[] = $style;
		wp_enqueue_script( 'tanvis-' . $name );
		$deps[] = 'tanvis-' . $name;
	}

	if ( did_action( 'wp_head' ) && ! empty( $styles ) ) {
		wp_print_styles( $styles );
	}

	if ( in_array( 'tanvis-leaflet', $deps, true ) ) {
		$brcatlas = $scripts->registered['tanvis-brcatlas'];
		if ( ! in_array( 'tanvis-leaflet', $brcatlas->deps, true ) ) {
			$brcatlas->deps[] = 'tanvis-leaflet';
		}
	}

	// Load the main script after every library any shortcode on the page needs.
	$main = $scripts->registered['tanvis'];
	$main->deps = array_values( array_unique( array_merge( $main->deps, $deps ) ) );
	wp_enqueue_script( 'tanvis' );
}

/* ---------- Shortcode ---------- */

// Every attribute becomes a data-vis-* attribute, e.g. [tanvis type="increasing-species-table" top-n="25"].
add_shortcode(
	'tanvis',
	function ( $atts ) {
		$atts = is_array( $atts ) ? $atts : array();
		if ( empty( $atts['type'] ) ) {
			return '';
		}

		$html     = '';
		$map_type = 'static';
		foreach ( $atts as $name => $value ) {
			if ( ! is_string( $name ) ) {
				continue;
			}
			$name = str_replace( '_', '-', strtolower( $name ) );
			if ( ! preg_match( '/^[a-z][a-z0-9-]*$/', $name ) ) {
				continue;
			}
			if ( 'map-type' === $name ) {
				$map_type = $value;
			}
			if ( 'id' === $name ) {
				$html .= ' id="' . esc_attr( $value ) . '"';
			} else {
				$html .= ' data-vis-' . $name . '="' . esc_attr( $value ) . '"';
			}
		}

		tanvis_wp_enqueue( $atts['type'], $map_type );

		return '<div class="tanvis"' . $html . '></div>';
	}
);
