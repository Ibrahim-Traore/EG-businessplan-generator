-- CreateTable
CREATE TABLE "Livrable" (
    "id" TEXT NOT NULL,
    "projectSlug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Livrable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Livrable_projectSlug_path_key" ON "Livrable"("projectSlug", "path");

-- AddForeignKey
ALTER TABLE "Livrable" ADD CONSTRAINT "Livrable_projectSlug_fkey" FOREIGN KEY ("projectSlug") REFERENCES "Project"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
