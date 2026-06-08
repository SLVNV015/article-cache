import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
export type ICurrentUser = {
  userId: string;
  sessionId: string;
};

export const CurrentUser = createParamDecorator(
  (_: string, ctx): ICurrentUser => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user as ICurrentUser;
  },
);
