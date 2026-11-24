-- CreateTable
CREATE TABLE IF NOT EXISTS `ProductInteraction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `sessionId` VARCHAR(100) NULL,
    `productId` INTEGER NOT NULL,
    `eventType` ENUM('VIEW', 'WISHLIST_ADD', 'WISHLIST_REMOVE', 'CART_ADD', 'CART_REMOVE', 'PURCHASE', 'RATING', 'RECOMMENDATION_CLICK') NOT NULL,
    `weight` DOUBLE NOT NULL DEFAULT 1.0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductInteraction_userId_productId_idx`(`userId`, `productId`),
    INDEX `ProductInteraction_sessionId_productId_idx`(`sessionId`, `productId`),
    INDEX `ProductInteraction_productId_idx`(`productId`),
    INDEX `ProductInteraction_eventType_idx`(`eventType`),
    INDEX `ProductInteraction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `ProductInteraction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ProductInteraction_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
