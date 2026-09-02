<?php

namespace Mojimoto\Laravel\RichText;

/**
 * Span offsets in Mojimoto rich text are UTF-16 code units (the same model as
 * JavaScript strings and Prismic), so slicing has to happen in UTF-16 too or
 * any emoji or astral character shifts every span after it.
 */
final class Utf16
{
    public static function length(string $text): int
    {
        return intdiv(strlen(mb_convert_encoding($text, 'UTF-16BE', 'UTF-8')), 2);
    }

    public static function slice(string $text, int $start, int $end): string
    {
        if ($end <= $start) {
            return '';
        }

        $units = mb_convert_encoding($text, 'UTF-16BE', 'UTF-8');

        $bytes = substr($units, $start * 2, ($end - $start) * 2);

        return mb_convert_encoding($bytes, 'UTF-8', 'UTF-16BE');
    }
}
