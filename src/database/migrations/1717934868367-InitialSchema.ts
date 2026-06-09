import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1717934868367 implements MigrationInterface {
  name = 'InitialSchema1717934868367';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password" character varying NOT NULL,
        "name" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(512) NOT NULL,
        "description" character varying(1024) NOT NULL,
        "content" text,
        "author_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_articles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_articles_author_id" ON "articles" ("author_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_articles_created_at" ON "articles" ("created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "articles"
      ADD CONSTRAINT "FK_articles_author"
      FOREIGN KEY ("author_id")
      REFERENCES "user"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_articles_author"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_articles_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_articles_author_id"`);
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
