CREATE TABLE zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    district VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    cell VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,

    zone_operator_id INT NULL,

    zo_registered_name VARCHAR(100) NOT NULL,
    zo_registered_phone VARCHAR(20) NOT NULL,

    

    INDEX idx_zone_operator (zone_operator_id),
    INDEX idx_zone_location (district, sector, cell),
    INDEX idx_zone_geo_lat_lng (latitude, longitude),

    CONSTRAINT fk_zone_operator FOREIGN KEY (zone_operator_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;