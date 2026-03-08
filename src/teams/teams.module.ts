import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeamsService } from "./teams.service";
import { TeamsController } from "./teams.controller";
import { Team } from "./entities/team.entity";
import { User } from "../auth/entities/user.entity";
import { Component } from "../catalog/entities/component.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Team, User, Component])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
