import { Injectable, inject, makeStateKey, TransferState, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

const STARS_KEY = makeStateKey<number>('github_repo_stars');

// Simple static server-side memory cache to prevent hitting GitHub's API rate limits on every render
let serverCache: { stars: number; expiresAt: number } | null = null;
const CACHE_TTL = 300_000; // 5 minutes in ms

@Injectable({
  providedIn: 'root',
})
export class GithubService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly repoUrl = 'https://api.github.com/repos/Daranix/definitive-tools';

  getRepoStars(): Observable<number> {
    // 1. If key exists in TransferState (Client hydrated from SSR), use it immediately
    if (this.transferState.hasKey(STARS_KEY)) {
      const stars = this.transferState.get(STARS_KEY, 0);
      return of(stars);
    }

    // 2. Server-side path with local memory cache to avoid multiple calls across renders
    if (isPlatformServer(this.platformId)) {
      if (serverCache && Date.now() < serverCache.expiresAt) {
        this.transferState.set(STARS_KEY, serverCache.stars);
        return of(serverCache.stars);
      }
    }

    // 3. Perform the actual HTTP call
    return this.http.get<{ stargazers_count: number }>(this.repoUrl).pipe(
      map((data) => data.stargazers_count),
      tap((stars) => {
        // Set TransferState so client receives it without duplicate HTTP call
        this.transferState.set(STARS_KEY, stars);

        // Cache on server memory if we are executing on SSR
        if (isPlatformServer(this.platformId)) {
          serverCache = {
            stars,
            expiresAt: Date.now() + CACHE_TTL,
          };
        }
      }),
      catchError(() => of(0))
    );
  }
}
