CREATE TYPE "PromoBannerMediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "PromoBanner" ADD COLUMN "mediaType" "PromoBannerMediaType" NOT NULL DEFAULT 'IMAGE';
