import { MigrationInterface, QueryRunner } from "typeorm";

export class Indexes1781095132183 implements MigrationInterface {
    name = 'Indexes1781095132183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_author"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_articles_author_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_articles_created_at"`);
        await queryRunner.query(`CREATE INDEX "IDX_766eaf03c57b40f88a205e0c7e" ON "articles"  ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c6afe716f2efa35d9a803dd40" ON "articles"  ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa73b0d3e0b30b37ce4dd9012d" ON "articles"  ("author_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa73b0d3e0b30b37ce4dd9012d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c6afe716f2efa35d9a803dd40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_766eaf03c57b40f88a205e0c7e"`);
        await queryRunner.query(`CREATE INDEX "IDX_articles_created_at" ON "articles" USING btree ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_articles_author_id" ON "articles" USING btree ("author_id") `);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_articles_author" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
