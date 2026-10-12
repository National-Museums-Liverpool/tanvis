<?php

class Tanvis_Assets_Test extends WP_UnitTestCase {
	private function clear_tanvis_assets() {
		$scripts = wp_scripts();
		$styles  = wp_styles();

		foreach ( array( 'tanvis', 'tanvis-d3', 'tanvis-leaflet', 'tanvis-tabulator', 'tanvis-brcatlas', 'tanvis-brccharts' ) as $handle ) {
			wp_dequeue_script( $handle );
			wp_deregister_script( $handle );
			wp_dequeue_style( $handle );
			wp_deregister_style( $handle );
		}

		$scripts->done = array();
		$styles->done  = array();
	}

	public function set_up() {
		parent::set_up();
		$this->clear_tanvis_assets();
	}

	public function test_assets_are_registered_even_if_main_handle_exists() {
		wp_register_script( 'tanvis', 'https://example.test/existing-tanvis.js' );

		tanvis_wp_register_assets();

		$this->assertTrue( wp_style_is( 'tanvis-leaflet', 'registered' ) );
		$this->assertTrue( wp_script_is( 'tanvis-leaflet', 'registered' ) );
	}

	public function test_leaflet_assets_are_enqueued_before_head_for_shortcode_content() {
		$post_id = self::factory()->post->create(
			array(
				'post_content' => '[tanvis type="species-map" map-type="leaflet"]',
			)
		);
		$this->go_to( get_permalink( $post_id ) );

		do_action( 'wp_enqueue_scripts' );

		$this->assertTrue( wp_style_is( 'tanvis-leaflet', 'enqueued' ) );
		$this->assertTrue( wp_script_is( 'tanvis-leaflet', 'enqueued' ) );
	}

	public function test_leaflet_styles_are_printed_when_shortcode_renders_after_head() {
		if ( ! did_action( 'wp_head' ) ) {
			do_action( 'wp_head' );
		}

		ob_start();
		do_shortcode( '[tanvis type="species-map" map-type="leaflet"]' );
		$styles = ob_get_clean();

		$this->assertStringContainsString( 'tanvis-leaflet-css', $styles );
		$this->assertStringContainsString( 'leaflet.css', $styles );
	}
}