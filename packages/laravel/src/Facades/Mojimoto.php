<?php

namespace Mojimoto\Laravel\Facades;

use Illuminate\Support\Facades\Facade;
use Mojimoto\Laravel\Client;

/**
 * @method static \Mojimoto\Laravel\ListResponse query(array $options = [])
 * @method static array all(array $options = [])
 * @method static \Mojimoto\Laravel\Document|null first(array $options = [])
 * @method static \Mojimoto\Laravel\Document|null byUid(string $type, string $uid, array $options = [])
 * @method static \Mojimoto\Laravel\Document findByUid(string $type, string $uid, array $options = [])
 * @method static \Mojimoto\Laravel\Document byId(int $id, array $options = [])
 * @method static \Mojimoto\Laravel\Client usePreview(bool $preview = true)
 * @method static bool isPreviewing()
 * @method static void flush()
 *
 * @see Client
 */
class Mojimoto extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return Client::class;
    }
}
