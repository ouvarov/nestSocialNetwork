import { Controller, Get, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('/find-all')
  findAll() {
    return this.userService.findAll();
  }

  @Get('/getUser')
  getUser(@Body() id: string) {
    return this.userService.findOneById(id);
  }
}
