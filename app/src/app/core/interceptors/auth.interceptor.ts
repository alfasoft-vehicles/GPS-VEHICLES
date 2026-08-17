import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthRoute =
    req.url.includes('/users/login') ||
    req.url.includes('/users/refresh-token') ||
    req.url.includes('/users/logout');

  let requestToForward = req.clone({
    withCredentials: true,
  });

  if (!isAuthRoute && authService.accessToken) {
    requestToForward = addAuthHeader(requestToForward, authService.accessToken);
  }

  return next(requestToForward).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRoute && authService.accessToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshAccessToken().pipe(
            switchMap((tokenResponse) => {
              refreshTokenSubject.next(tokenResponse.access_token);
              const retryReq = addAuthHeader(
                req.clone({ withCredentials: true }),
                tokenResponse.access_token,
              );
              return next(retryReq);
            }),
            catchError((refreshError) => {
              authService.logout();
              return throwError(() => refreshError);
            }),
            finalize(() => {
              isRefreshing = false;
            }),
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((token): token is string => token !== null),
            take(1),
            switchMap((newToken) => {
              const retryReq = addAuthHeader(req.clone({ withCredentials: true }), newToken);
              return next(retryReq);
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};

function addAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (token) {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return req;
}
