<?php

class Coordinate {

	private $latitude;
	private $longtitude;

	function __construct($latitude, $longtitude) {
		$this->latitude = $latitude;
		$this->longtitude = $longtitude;
	}

	public function __toString() {
        return $this->latitude . "," . $this->longtitude;
    }

	public function equals(Car $anotherCoordinate) {
		if($anotherCoordinate->getLatitude() !== $this->latitude) {
			return false;
		}

		if($anotherCoordinate->getLongtitude() !== $this->longtitude) {
			return false;
		}
		return true;
  	}

  	public function getLatitude() {
  		return $this->latitude;
  	}

	public function getLongtitude() {
  		return $this->longtitude;
  	}
}